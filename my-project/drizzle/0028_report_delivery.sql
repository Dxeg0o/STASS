CREATE TABLE IF NOT EXISTS "report_delivery" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "servicio_id" uuid NOT NULL REFERENCES "servicio"("id") ON DELETE cascade,
  "recipient_correo" text NOT NULL,
  "report_date" date NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "attempts" integer NOT NULL DEFAULT 0,
  "last_error" text,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "report_delivery_service_recipient_date" UNIQUE ("servicio_id", "recipient_correo", "report_date")
);

CREATE INDEX IF NOT EXISTS "idx_report_delivery_status"
  ON "report_delivery" ("status", "report_date");
