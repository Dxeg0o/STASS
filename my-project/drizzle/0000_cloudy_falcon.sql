CREATE TABLE "conteo" (
	"ts" timestamp with time zone NOT NULL,
	"servicio_id" uuid NOT NULL,
	"lote_id" uuid NOT NULL,
	"dispositivo_id" uuid NOT NULL,
	"perimeter" real NOT NULL,
	"direction" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispositivo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"tipo" text DEFAULT 'nvidia_agx' NOT NULL,
	"activo" boolean DEFAULT true,
	CONSTRAINT "dispositivo_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "dispositivo_servicio" (
	"dispositivo_id" uuid NOT NULL,
	"servicio_id" uuid NOT NULL,
	"maquina" text,
	"asignado_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "dispositivo_servicio_dispositivo_id_servicio_id_pk" PRIMARY KEY("dispositivo_id","servicio_id")
);
--> statement-breakpoint
CREATE TABLE "empresa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"pais" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "empresa_usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"rol" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "empresa_usuario_usuario_id_empresa_id_unique" UNIQUE("usuario_id","empresa_id")
);
--> statement-breakpoint
CREATE TABLE "lote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"servicio_id" uuid NOT NULL,
	"variedad_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lote_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lote_id" uuid NOT NULL,
	"dispositivo_id" uuid NOT NULL,
	"servicio_id" uuid NOT NULL,
	"start_time" timestamp with time zone DEFAULT now() NOT NULL,
	"end_time" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "producto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "producto_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "servicio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"empresa_id" uuid NOT NULL,
	"ubicacion_id" uuid,
	"tipo" text NOT NULL,
	"fecha_inicio" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_fin" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ubicacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"empresa_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"boundaries" jsonb
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"correo" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "usuario_correo_unique" UNIQUE("correo")
);
--> statement-breakpoint
CREATE TABLE "variedad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"tipo" text,
	"producto_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "variedad_nombre_producto_id_unique" UNIQUE("nombre","producto_id")
);
--> statement-breakpoint
ALTER TABLE "dispositivo_servicio" ADD CONSTRAINT "dispositivo_servicio_dispositivo_id_dispositivo_id_fk" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispositivo_servicio" ADD CONSTRAINT "dispositivo_servicio_servicio_id_servicio_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_usuario" ADD CONSTRAINT "empresa_usuario_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_usuario" ADD CONSTRAINT "empresa_usuario_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote" ADD CONSTRAINT "lote_servicio_id_servicio_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote" ADD CONSTRAINT "lote_variedad_id_variedad_id_fk" FOREIGN KEY ("variedad_id") REFERENCES "public"."variedad"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_session" ADD CONSTRAINT "lote_session_lote_id_lote_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_ubicacion_id_ubicacion_id_fk" FOREIGN KEY ("ubicacion_id") REFERENCES "public"."ubicacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ubicacion" ADD CONSTRAINT "ubicacion_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variedad" ADD CONSTRAINT "variedad_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_conteo_lote" ON "conteo" USING btree ("lote_id","ts");--> statement-breakpoint
CREATE INDEX "idx_conteo_servicio" ON "conteo" USING btree ("servicio_id","ts");--> statement-breakpoint
CREATE INDEX "idx_conteo_dispositivo" ON "conteo" USING btree ("dispositivo_id","ts");