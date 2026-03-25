CREATE TABLE "lote_stats" (
	"lote_id" uuid NOT NULL,
	"dispositivo_id" uuid NOT NULL,
	"calibre" real NOT NULL,
	"count_in" integer DEFAULT 0 NOT NULL,
	"count_out" integer DEFAULT 0 NOT NULL,
	"first_ts" timestamp with time zone,
	"last_ts" timestamp with time zone,
	CONSTRAINT "lote_stats_lote_id_dispositivo_id_calibre_pk" PRIMARY KEY("lote_id","dispositivo_id","calibre")
);
--> statement-breakpoint
ALTER TABLE "lote_stats" ADD CONSTRAINT "lote_stats_lote_id_lote_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_stats" ADD CONSTRAINT "lote_stats_dispositivo_id_dispositivo_id_fk" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivo"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Función de trigger para mantener lote_stats actualizado en tiempo real
CREATE OR REPLACE FUNCTION update_lote_stats()
RETURNS trigger AS $$
BEGIN
  INSERT INTO lote_stats (lote_id, dispositivo_id, calibre, count_in, count_out, first_ts, last_ts)
  VALUES (
    NEW.lote_id,
    NEW.dispositivo_id,
    ROUND(NEW.perimeter::numeric, 1)::real,
    CASE WHEN NEW.direction = 0 THEN 1 ELSE 0 END,
    CASE WHEN NEW.direction = 1 THEN 1 ELSE 0 END,
    NEW.ts,
    NEW.ts
  )
  ON CONFLICT (lote_id, dispositivo_id, calibre) DO UPDATE SET
    count_in  = lote_stats.count_in  + excluded.count_in,
    count_out = lote_stats.count_out + excluded.count_out,
    first_ts  = LEAST(lote_stats.first_ts, excluded.first_ts),
    last_ts   = GREATEST(lote_stats.last_ts, excluded.last_ts);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER conteo_stats_trigger
AFTER INSERT ON conteo
FOR EACH ROW EXECUTE FUNCTION update_lote_stats();
--> statement-breakpoint

-- Backfill de datos existentes en conteo
INSERT INTO lote_stats (lote_id, dispositivo_id, calibre, count_in, count_out, first_ts, last_ts)
SELECT
  lote_id,
  dispositivo_id,
  ROUND(perimeter::numeric, 1)::real AS calibre,
  SUM(CASE WHEN direction = 0 THEN 1 ELSE 0 END)::int AS count_in,
  SUM(CASE WHEN direction = 1 THEN 1 ELSE 0 END)::int AS count_out,
  MIN(ts) AS first_ts,
  MAX(ts) AS last_ts
FROM conteo
GROUP BY lote_id, dispositivo_id, ROUND(perimeter::numeric, 1)
ON CONFLICT (lote_id, dispositivo_id, calibre) DO UPDATE SET
  count_in  = excluded.count_in,
  count_out = excluded.count_out,
  first_ts  = excluded.first_ts,
  last_ts   = excluded.last_ts;