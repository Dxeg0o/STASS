CREATE TABLE "caja_total_stats" (
	"caja_lote_session_id" uuid NOT NULL,
	"dispositivo_id" uuid NOT NULL,
	"count_in" integer DEFAULT 0 NOT NULL,
	"count_out" integer DEFAULT 0 NOT NULL,
	"first_ts" timestamp with time zone,
	"last_ts" timestamp with time zone,
	CONSTRAINT "caja_total_stats_caja_lote_session_id_dispositivo_id_pk" PRIMARY KEY("caja_lote_session_id","dispositivo_id")
);
--> statement-breakpoint
CREATE TABLE "lote_total_stats" (
	"lote_id" uuid NOT NULL,
	"servicio_id" uuid NOT NULL,
	"dispositivo_id" uuid NOT NULL,
	"count_in" integer DEFAULT 0 NOT NULL,
	"count_out" integer DEFAULT 0 NOT NULL,
	"first_ts" timestamp with time zone,
	"last_ts" timestamp with time zone,
	CONSTRAINT "lote_total_stats_lote_id_servicio_id_dispositivo_id_pk" PRIMARY KEY("lote_id","servicio_id","dispositivo_id")
);
--> statement-breakpoint
ALTER TABLE "caja_total_stats" ADD CONSTRAINT "caja_total_stats_caja_lote_session_id_caja_lote_session_id_fk" FOREIGN KEY ("caja_lote_session_id") REFERENCES "public"."caja_lote_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_total_stats" ADD CONSTRAINT "caja_total_stats_dispositivo_id_dispositivo_id_fk" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_total_stats" ADD CONSTRAINT "lote_total_stats_lote_id_lote_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_total_stats" ADD CONSTRAINT "lote_total_stats_servicio_id_servicio_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_total_stats" ADD CONSTRAINT "lote_total_stats_dispositivo_id_dispositivo_id_fk" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "conteo" ALTER COLUMN "perimeter" DROP NOT NULL;
--> statement-breakpoint

INSERT INTO lote_total_stats (
  lote_id, servicio_id, dispositivo_id,
  count_in, count_out, first_ts, last_ts
)
SELECT
  c.lote_id,
  c.servicio_id,
  c.dispositivo_id,
  SUM(CASE WHEN c.direction = 0 THEN 1 ELSE 0 END)::int,
  SUM(CASE WHEN c.direction = 1 THEN 1 ELSE 0 END)::int,
  MIN(c.ts),
  MAX(c.ts)
FROM conteo c
GROUP BY c.lote_id, c.servicio_id, c.dispositivo_id
ON CONFLICT (lote_id, servicio_id, dispositivo_id) DO UPDATE SET
  count_in  = lote_total_stats.count_in  + excluded.count_in,
  count_out = lote_total_stats.count_out + excluded.count_out,
  first_ts  = LEAST(lote_total_stats.first_ts, excluded.first_ts),
  last_ts   = GREATEST(lote_total_stats.last_ts, excluded.last_ts);
--> statement-breakpoint

INSERT INTO caja_total_stats (
  caja_lote_session_id, dispositivo_id,
  count_in, count_out, first_ts, last_ts
)
SELECT
  c.caja_lote_session_id,
  c.dispositivo_id,
  SUM(CASE WHEN c.direction = 0 THEN 1 ELSE 0 END)::int,
  SUM(CASE WHEN c.direction = 1 THEN 1 ELSE 0 END)::int,
  MIN(c.ts),
  MAX(c.ts)
FROM conteo c
WHERE c.caja_lote_session_id IS NOT NULL
GROUP BY c.caja_lote_session_id, c.dispositivo_id
ON CONFLICT (caja_lote_session_id, dispositivo_id) DO UPDATE SET
  count_in  = caja_total_stats.count_in  + excluded.count_in,
  count_out = caja_total_stats.count_out + excluded.count_out,
  first_ts  = LEAST(caja_total_stats.first_ts, excluded.first_ts),
  last_ts   = GREATEST(caja_total_stats.last_ts, excluded.last_ts);
--> statement-breakpoint

CREATE OR REPLACE FUNCTION update_lote_stats()
RETURNS trigger AS $$
BEGIN
  -- Totales por lote: incluyen mediciones con y sin calibre.
  INSERT INTO lote_total_stats (
    lote_id, servicio_id, dispositivo_id,
    count_in, count_out, first_ts, last_ts
  )
  SELECT
    r.lote_id,
    r.servicio_id,
    r.dispositivo_id,
    SUM(CASE WHEN r.direction = 0 THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN r.direction = 1 THEN 1 ELSE 0 END)::int,
    MIN(r.ts),
    MAX(r.ts)
  FROM new_rows r
  GROUP BY r.lote_id, r.servicio_id, r.dispositivo_id
  ON CONFLICT (lote_id, servicio_id, dispositivo_id) DO UPDATE SET
    count_in  = lote_total_stats.count_in  + excluded.count_in,
    count_out = lote_total_stats.count_out + excluded.count_out,
    first_ts  = LEAST(lote_total_stats.first_ts, excluded.first_ts),
    last_ts   = GREATEST(lote_total_stats.last_ts, excluded.last_ts);

  -- Distribucion por calibre: solo mediciones con calibre real.
  INSERT INTO lote_stats (
    lote_id, servicio_id, dispositivo_id, calibre,
    count_in, count_out, first_ts, last_ts
  )
  SELECT
    r.lote_id,
    r.servicio_id,
    r.dispositivo_id,
    ROUND(r.perimeter::numeric, 1)::real,
    SUM(CASE WHEN r.direction = 0 THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN r.direction = 1 THEN 1 ELSE 0 END)::int,
    MIN(r.ts),
    MAX(r.ts)
  FROM new_rows r
  WHERE r.perimeter IS NOT NULL
  GROUP BY
    r.lote_id,
    r.servicio_id,
    r.dispositivo_id,
    ROUND(r.perimeter::numeric, 1)::real
  ON CONFLICT (lote_id, servicio_id, dispositivo_id, calibre) DO UPDATE SET
    count_in  = lote_stats.count_in  + excluded.count_in,
    count_out = lote_stats.count_out + excluded.count_out,
    first_ts  = LEAST(lote_stats.first_ts, excluded.first_ts),
    last_ts   = GREATEST(lote_stats.last_ts, excluded.last_ts);

  -- Totales por caja: incluyen mediciones con y sin calibre.
  INSERT INTO caja_total_stats (
    caja_lote_session_id, dispositivo_id,
    count_in, count_out, first_ts, last_ts
  )
  SELECT
    r.caja_lote_session_id,
    r.dispositivo_id,
    SUM(CASE WHEN r.direction = 0 THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN r.direction = 1 THEN 1 ELSE 0 END)::int,
    MIN(r.ts),
    MAX(r.ts)
  FROM new_rows r
  WHERE r.caja_lote_session_id IS NOT NULL
  GROUP BY r.caja_lote_session_id, r.dispositivo_id
  ON CONFLICT (caja_lote_session_id, dispositivo_id) DO UPDATE SET
    count_in  = caja_total_stats.count_in  + excluded.count_in,
    count_out = caja_total_stats.count_out + excluded.count_out,
    first_ts  = LEAST(caja_total_stats.first_ts, excluded.first_ts),
    last_ts   = GREATEST(caja_total_stats.last_ts, excluded.last_ts);

  -- Distribucion por caja/calibre: solo mediciones con calibre real.
  INSERT INTO caja_stats (
    caja_lote_session_id, dispositivo_id, calibre,
    count_in, count_out, first_ts, last_ts
  )
  SELECT
    r.caja_lote_session_id,
    r.dispositivo_id,
    ROUND(r.perimeter::numeric, 1)::real,
    SUM(CASE WHEN r.direction = 0 THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN r.direction = 1 THEN 1 ELSE 0 END)::int,
    MIN(r.ts),
    MAX(r.ts)
  FROM new_rows r
  WHERE r.caja_lote_session_id IS NOT NULL
    AND r.perimeter IS NOT NULL
  GROUP BY
    r.caja_lote_session_id,
    r.dispositivo_id,
    ROUND(r.perimeter::numeric, 1)::real
  ON CONFLICT (caja_lote_session_id, dispositivo_id, calibre) DO UPDATE SET
    count_in  = caja_stats.count_in  + excluded.count_in,
    count_out = caja_stats.count_out + excluded.count_out,
    first_ts  = LEAST(caja_stats.first_ts, excluded.first_ts),
    last_ts   = GREATEST(caja_stats.last_ts, excluded.last_ts);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS conteo_stats_trigger ON "conteo";
--> statement-breakpoint

CREATE TRIGGER conteo_stats_trigger
  AFTER INSERT ON "conteo"
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_lote_stats();
