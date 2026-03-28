-- ═══════════════════════════════════════════════════════════
-- Fase 1: Crear tablas nuevas (sin dependencias de datos)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE "tipo_proceso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"empresa_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflow_empresa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"empresa_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflow_paso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_empresa_id" uuid NOT NULL,
	"tipo_proceso_id" uuid NOT NULL,
	"orden" integer NOT NULL,
	CONSTRAINT "workflow_paso_workflow_empresa_id_orden_unique" UNIQUE("workflow_empresa_id","orden")
);
--> statement-breakpoint
CREATE TABLE "proceso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo_proceso_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"producto_id" uuid,
	"temporada" text,
	"estado" text DEFAULT 'planificado' NOT NULL,
	"fecha_inicio" timestamp with time zone,
	"fecha_fin" timestamp with time zone,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lote_servicio" (
	"lote_id" uuid NOT NULL,
	"servicio_id" uuid NOT NULL,
	"asignado_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "lote_servicio_lote_id_servicio_id_pk" PRIMARY KEY("lote_id","servicio_id")
);
--> statement-breakpoint
CREATE TABLE "caja" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"empresa_id" uuid NOT NULL,
	"tipo" text DEFAULT 'reutilizable' NOT NULL,
	"capacidad" integer,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "caja_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "caja_lote_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caja_id" uuid NOT NULL,
	"lote_session_id" uuid NOT NULL,
	"asignado_at" timestamp with time zone DEFAULT now(),
	"retirado_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "caja_stats" (
	"caja_lote_session_id" uuid NOT NULL,
	"dispositivo_id" uuid NOT NULL,
	"calibre" real NOT NULL,
	"count_in" integer DEFAULT 0 NOT NULL,
	"count_out" integer DEFAULT 0 NOT NULL,
	"first_ts" timestamp with time zone,
	"last_ts" timestamp with time zone,
	CONSTRAINT "caja_stats_caja_lote_session_id_dispositivo_id_calibre_pk" PRIMARY KEY("caja_lote_session_id","dispositivo_id","calibre")
);
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════
-- Fase 2: FKs de tablas nuevas
-- ═══════════════════════════════════════════════════════════

ALTER TABLE "tipo_proceso" ADD CONSTRAINT "tipo_proceso_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_empresa" ADD CONSTRAINT "workflow_empresa_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_paso" ADD CONSTRAINT "workflow_paso_workflow_empresa_id_workflow_empresa_id_fk" FOREIGN KEY ("workflow_empresa_id") REFERENCES "public"."workflow_empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_paso" ADD CONSTRAINT "workflow_paso_tipo_proceso_id_tipo_proceso_id_fk" FOREIGN KEY ("tipo_proceso_id") REFERENCES "public"."tipo_proceso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proceso" ADD CONSTRAINT "proceso_tipo_proceso_id_tipo_proceso_id_fk" FOREIGN KEY ("tipo_proceso_id") REFERENCES "public"."tipo_proceso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proceso" ADD CONSTRAINT "proceso_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proceso" ADD CONSTRAINT "proceso_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_servicio" ADD CONSTRAINT "lote_servicio_lote_id_lote_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_servicio" ADD CONSTRAINT "lote_servicio_servicio_id_servicio_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja" ADD CONSTRAINT "caja_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_lote_session" ADD CONSTRAINT "caja_lote_session_caja_id_caja_id_fk" FOREIGN KEY ("caja_id") REFERENCES "public"."caja"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_lote_session" ADD CONSTRAINT "caja_lote_session_lote_session_id_lote_session_id_fk" FOREIGN KEY ("lote_session_id") REFERENCES "public"."lote_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_stats" ADD CONSTRAINT "caja_stats_caja_lote_session_id_caja_lote_session_id_fk" FOREIGN KEY ("caja_lote_session_id") REFERENCES "public"."caja_lote_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_stats" ADD CONSTRAINT "caja_stats_dispositivo_id_dispositivo_id_fk" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════
-- Fase 3: Agregar columnas nuevas a tablas existentes
-- ═══════════════════════════════════════════════════════════

ALTER TABLE "servicio" ADD COLUMN "proceso_id" uuid;--> statement-breakpoint
ALTER TABLE "servicio" ADD COLUMN "usa_cajas" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_proceso_id_proceso_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."proceso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteo" ADD COLUMN "caja_lote_session_id" uuid;--> statement-breakpoint
ALTER TABLE "conteo" ADD CONSTRAINT "conteo_caja_lote_session_id_caja_lote_session_id_fk" FOREIGN KEY ("caja_lote_session_id") REFERENCES "public"."caja_lote_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════
-- Fase 4: Migrar datos ANTES de eliminar columnas
-- ═══════════════════════════════════════════════════════════

-- 4a. Migrar lote.servicio_id → lote_servicio
INSERT INTO lote_servicio (lote_id, servicio_id)
SELECT id, servicio_id FROM lote WHERE servicio_id IS NOT NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- 4b. Agregar servicio_id a lote_stats (nullable primero)
ALTER TABLE "lote_stats" ADD COLUMN "servicio_id" uuid;
--> statement-breakpoint

-- 4c. Backfill lote_stats.servicio_id desde conteo
UPDATE lote_stats ls
SET servicio_id = sub.servicio_id
FROM (
  SELECT DISTINCT lote_id, dispositivo_id, servicio_id
  FROM conteo
) sub
WHERE ls.lote_id = sub.lote_id
  AND ls.dispositivo_id = sub.dispositivo_id
  AND ls.servicio_id IS NULL;
--> statement-breakpoint

-- 4d. Hacer servicio_id NOT NULL y agregar FK
ALTER TABLE "lote_stats" ALTER COLUMN "servicio_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "lote_stats" ADD CONSTRAINT "lote_stats_servicio_id_servicio_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicio"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- 4e. Cambiar PK de lote_stats
ALTER TABLE "lote_stats" DROP CONSTRAINT "lote_stats_lote_id_dispositivo_id_calibre_pk";
--> statement-breakpoint
ALTER TABLE "lote_stats" ADD CONSTRAINT "lote_stats_lote_id_servicio_id_dispositivo_id_calibre_pk" PRIMARY KEY("lote_id","servicio_id","dispositivo_id","calibre");
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════
-- Fase 5: Eliminar columnas obsoletas de lote
-- ═══════════════════════════════════════════════════════════

ALTER TABLE "lote" DROP CONSTRAINT "lote_servicio_id_servicio_id_fk";
--> statement-breakpoint
ALTER TABLE "lote" DROP COLUMN "nombre";
--> statement-breakpoint
ALTER TABLE "lote" DROP COLUMN "servicio_id";
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════
-- Fase 6: Modificar trigger para dual-path (lote_stats + caja_stats)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_lote_stats()
RETURNS trigger AS $$
BEGIN
  IF NEW.caja_lote_session_id IS NOT NULL THEN
    -- Con cajas → caja_stats
    INSERT INTO caja_stats (caja_lote_session_id, dispositivo_id, calibre, count_in, count_out, first_ts, last_ts)
    VALUES (
      NEW.caja_lote_session_id,
      NEW.dispositivo_id,
      ROUND(NEW.perimeter::numeric, 1)::real,
      CASE WHEN NEW.direction = 0 THEN 1 ELSE 0 END,
      CASE WHEN NEW.direction = 1 THEN 1 ELSE 0 END,
      NEW.ts,
      NEW.ts
    )
    ON CONFLICT (caja_lote_session_id, dispositivo_id, calibre) DO UPDATE SET
      count_in  = caja_stats.count_in  + excluded.count_in,
      count_out = caja_stats.count_out + excluded.count_out,
      first_ts  = LEAST(caja_stats.first_ts, excluded.first_ts),
      last_ts   = GREATEST(caja_stats.last_ts, excluded.last_ts);
  ELSE
    -- Sin cajas → lote_stats (con servicio_id)
    INSERT INTO lote_stats (lote_id, servicio_id, dispositivo_id, calibre, count_in, count_out, first_ts, last_ts)
    VALUES (
      NEW.lote_id,
      NEW.servicio_id,
      NEW.dispositivo_id,
      ROUND(NEW.perimeter::numeric, 1)::real,
      CASE WHEN NEW.direction = 0 THEN 1 ELSE 0 END,
      CASE WHEN NEW.direction = 1 THEN 1 ELSE 0 END,
      NEW.ts,
      NEW.ts
    )
    ON CONFLICT (lote_id, servicio_id, dispositivo_id, calibre) DO UPDATE SET
      count_in  = lote_stats.count_in  + excluded.count_in,
      count_out = lote_stats.count_out + excluded.count_out,
      first_ts  = LEAST(lote_stats.first_ts, excluded.first_ts),
      last_ts   = GREATEST(lote_stats.last_ts, excluded.last_ts);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
