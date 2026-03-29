-- Add cascade deletes to dispositivo_servicio foreign keys
ALTER TABLE "dispositivo_servicio" DROP CONSTRAINT IF EXISTS "dispositivo_servicio_dispositivo_id_dispositivo_id_fk";
ALTER TABLE "dispositivo_servicio" DROP CONSTRAINT IF EXISTS "dispositivo_servicio_servicio_id_servicio_id_fk";
ALTER TABLE "dispositivo_servicio" ADD CONSTRAINT "dispositivo_servicio_dispositivo_id_dispositivo_id_fk" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivo"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "dispositivo_servicio" ADD CONSTRAINT "dispositivo_servicio_servicio_id_servicio_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicio"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Create invitation_link table
CREATE TABLE IF NOT EXISTS "invitation_link" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token" text NOT NULL UNIQUE,
  "empresa_id" uuid NOT NULL,
  "rol" text NOT NULL,
  "expires_at" timestamp with time zone,
  "used_at" timestamp with time zone,
  "used_by_usuario_id" uuid,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "invitation_link_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "invitation_link_used_by_usuario_id_usuario_id_fk" FOREIGN KEY ("used_by_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "invitation_link_created_by_usuario_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
