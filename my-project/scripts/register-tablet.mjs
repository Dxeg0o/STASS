// ─────────────────────────────────────────────────────────────────────────────
// Alta / rotación de app-keys de tablets (app Flutter de operador).
//
// Cada tablet se autentica contra la API con un x-app-key propio. Este script
// genera un token aleatorio, guarda en la tabla `tablet` SOLO el hash SHA-256
// (nunca el plaintext) e imprime el token EN CRUDO UNA SOLA VEZ para cargarlo
// en la tablet (pantalla de Configuración → tarjeta de emparejamiento).
//
// El hash es idéntico al que calcula src/lib/app-auth.ts (SHA-256 hex del token
// UTF-8), así que la key generada acá valida directo contra la API.
//
//   node scripts/register-tablet.mjs --nombre="Tablet Packing 1"
//   node scripts/register-tablet.mjs --nombre="Tablet Packing 1" --rotate
//   node scripts/register-tablet.mjs --list
//   node scripts/register-tablet.mjs --nombre="Tablet Packing 1" --desactivar
//
// Flags:
//   --nombre=...   nombre identificable de la tablet (requerido salvo --list)
//   --rotate       si la tablet ya existe, regenera su key (invalida la anterior)
//   --desactivar   marca la tablet como inactiva (revoca su acceso, sin borrarla)
//   --list         lista las tablets registradas (sin exponer keys)
// ─────────────────────────────────────────────────────────────────────────────
import { config } from "dotenv";
import crypto from "crypto";
import postgres from "postgres";

config({ path: ".env.local" });

const arg = (name) => {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq === -1 ? true : hit.slice(eq + 1);
};

const NOMBRE = arg("nombre");
const ROTATE = arg("rotate") === true;
const DESACTIVAR = arg("desactivar") === true;
const LIST = arg("list") === true;

const cs = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL;
if (!cs) {
  console.error("✗ Falta DATABASE_URL / DATABASE_URL_POOLER en .env.local");
  process.exit(1);
}
const sql = postgres(cs, { max: 1, idle_timeout: 20, connect_timeout: 15 });

const sha256hex = (raw) => crypto.createHash("sha256").update(raw, "utf8").digest("hex");

async function main() {
  if (LIST) {
    const rows = await sql`
      SELECT nombre, activo, created_at,
             (api_key_hash IS NOT NULL) AS tiene_key
      FROM tablet ORDER BY created_at NULLS LAST, nombre`;
    if (rows.length === 0) {
      console.log("(no hay tablets registradas)");
    } else {
      console.log("Tablets registradas:\n");
      for (const r of rows) {
        const estado = r.activo ? "activa" : "INACTIVA";
        const key = r.tiene_key ? "con key" : "SIN key";
        console.log(`  • ${r.nombre}  [${estado}, ${key}]`);
      }
    }
    return;
  }

  if (!NOMBRE || NOMBRE === true) {
    console.error('✗ Falta --nombre="..." (o usa --list).');
    process.exit(1);
  }

  const existing = await sql`SELECT id, activo FROM tablet WHERE nombre = ${NOMBRE} LIMIT 1`;

  if (DESACTIVAR) {
    if (existing.length === 0) {
      console.error(`✗ No existe una tablet con nombre "${NOMBRE}".`);
      process.exit(1);
    }
    await sql`UPDATE tablet SET activo = false WHERE nombre = ${NOMBRE}`;
    console.log(`✓ Tablet "${NOMBRE}" desactivada. Su app-key deja de validar.`);
    return;
  }

  if (existing.length > 0 && !ROTATE) {
    console.error(
      `✗ Ya existe una tablet "${NOMBRE}". Usa --rotate para regenerar su key ` +
        `(invalida la anterior) o --desactivar para revocarla.`
    );
    process.exit(1);
  }

  const token = crypto.randomBytes(32).toString("hex"); // 64 chars hex
  const hash = sha256hex(token);

  if (existing.length > 0) {
    await sql`UPDATE tablet SET api_key_hash = ${hash}, activo = true WHERE nombre = ${NOMBRE}`;
  } else {
    await sql`INSERT INTO tablet (nombre, api_key_hash, activo) VALUES (${NOMBRE}, ${hash}, true)`;
  }

  const accion = existing.length > 0 ? "rotada" : "registrada";
  console.log("");
  console.log(`✓ Tablet "${NOMBRE}" ${accion}.`);
  console.log("");
  console.log("  ┌─────────────────────────────────────────────────────────────────┐");
  console.log("  │  APP-KEY (se muestra UNA sola vez — cárgala en la tablet ahora):  │");
  console.log("  └─────────────────────────────────────────────────────────────────┘");
  console.log("");
  console.log(`    ${token}`);
  console.log("");
  console.log("  En la tablet: Configuración → pegar en la tarjeta de emparejamiento.");
  console.log("  Guarda una copia segura; en la base solo queda el hash, no el token.");
  console.log("");
}

main()
  .catch((e) => {
    console.error("✗ Error:", e.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
