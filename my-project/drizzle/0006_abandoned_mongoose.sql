ALTER TABLE "usuario" ADD COLUMN "reset_password_token" text;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "reset_password_expires_at" timestamp with time zone;