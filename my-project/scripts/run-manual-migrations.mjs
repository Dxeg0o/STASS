import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

// Supabase direct DB DNS puede no estar disponible desde el entorno de
// despliegue; cuando existe, el pooler es la conexión operativa preferida.
const databaseUrl = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL es requerido para ejecutar migraciones manuales.");
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const migrationDir = join(scriptDir, "..", "drizzle");
const migrations = [
  "0019_null_calibre.sql",
  "0020_revert_null_calibre.sql",
  "0022_tablet_auth.sql",
  "0023_lote_cierre_calibre_bin.sql",
  "0026_lote_cierre_calibre_rangos.sql",
  "0027_lote_cierre_calibre_bins_decimal.sql",
];
const sql = postgres(databaseUrl, { max: 1 });

async function isAlreadyAppliedInSchema(name) {
  if (name === "0019_null_calibre.sql" || name === "0020_revert_null_calibre.sql") {
    const [state] = await sql`
      SELECT
        (SELECT is_nullable = 'NO'
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'lote_stats'
           AND column_name = 'calibre') AS lote_calibre_not_null,
        (SELECT is_nullable = 'NO'
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'caja_stats'
           AND column_name = 'calibre') AS caja_calibre_not_null,
        EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'lote_stats_lote_id_servicio_id_dispositivo_id_calibre_pk'
        ) AS lote_primary_key,
        EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'caja_stats_caja_lote_session_id_dispositivo_id_calibre_pk'
        ) AS caja_primary_key
    `;
    return Boolean(
      state?.lote_calibre_not_null &&
        state?.caja_calibre_not_null &&
        state?.lote_primary_key &&
        state?.caja_primary_key
    );
  }

  if (name === "0022_tablet_auth.sql") {
    const [state] = await sql`
      SELECT to_regclass('public.tablet') IS NOT NULL AS exists
    `;
    return Boolean(state?.exists);
  }

  return false;
}

try {
  await sql`
    CREATE TABLE IF NOT EXISTS app_manual_migrations (
      name text PRIMARY KEY,
      applied_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `;

  for (const name of migrations) {
    const applied = await sql`
      SELECT 1 FROM app_manual_migrations WHERE name = ${name} LIMIT 1
    `;
    if (applied.length > 0) continue;

    if (await isAlreadyAppliedInSchema(name)) {
      await sql`
        INSERT INTO app_manual_migrations (name) VALUES (${name})
      `;
      console.log(`Registered existing manual migration: ${name}`);
      continue;
    }

    const source = await readFile(join(migrationDir, name), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(source);
      await tx`
        INSERT INTO app_manual_migrations (name) VALUES (${name})
      `;
    });
    console.log(`Applied manual migration: ${name}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
