CREATE TABLE "conteo_archive_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"file_path" text NOT NULL,
	"row_count" integer NOT NULL,
	"checksum" text,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conteo_archive_index_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "subvariedad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"variedad_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "subvariedad_nombre_variedad_id_unique" UNIQUE("nombre","variedad_id")
);
--> statement-breakpoint
ALTER TABLE "dispositivo_servicio" DROP CONSTRAINT "dispositivo_servicio_dispositivo_id_servicio_id_pk";--> statement-breakpoint
ALTER TABLE "servicio" ALTER COLUMN "fecha_inicio" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "servicio" ALTER COLUMN "fecha_inicio" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dispositivo" ADD COLUMN "api_key_hash" text;--> statement-breakpoint
ALTER TABLE "dispositivo_servicio" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "dispositivo_servicio" ADD COLUMN "fecha_inicio" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dispositivo_servicio" ADD COLUMN "fecha_termino" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invitation_link" ADD COLUMN "correo_invitado" text;--> statement-breakpoint
ALTER TABLE "lote" ADD COLUMN "subvariedad_id" uuid;--> statement-breakpoint
ALTER TABLE "servicio" ADD COLUMN "estado" text DEFAULT 'planificado' NOT NULL;--> statement-breakpoint
ALTER TABLE "subvariedad" ADD CONSTRAINT "subvariedad_variedad_id_variedad_id_fk" FOREIGN KEY ("variedad_id") REFERENCES "public"."variedad"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote" ADD CONSTRAINT "lote_subvariedad_id_subvariedad_id_fk" FOREIGN KEY ("subvariedad_id") REFERENCES "public"."subvariedad"("id") ON DELETE no action ON UPDATE no action;