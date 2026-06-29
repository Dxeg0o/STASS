/**
 * Exporta las ventanas (lote_session) de un dispositivo a Excel (.xlsx),
 * reproduciendo el formato del CSV "lotes_servicio_..._ventanas_...".
 *
 * Solo lectura. No modifica la base de datos.
 *
 * Uso:
 *   npx tsx scripts/export-dispositivo-ventanas.ts [NOMBRE_DISPOSITIVO] [--tz America/Santiago] [--dir 0|1|all]
 *
 * Ejemplos:
 *   npx tsx scripts/export-dispositivo-ventanas.ts ORIN-AGX-2
 *   npx tsx scripts/export-dispositivo-ventanas.ts ORIN-AGX-2 --tz America/Santiago --dir 0
 *
 * Requiere DATABASE_URL (o DATABASE_URL_POOLER) en .env.local
 */
import { config } from "dotenv";
import postgres from "postgres";
import * as XLSX from "xlsx";
import path from "node:path";

config({ path: ".env.local" });

// ── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getFlag(name: string, fallback: string): string {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
// Primer argumento posicional (que no sea una flag ni el valor de una flag) = nombre del dispositivo.
const positional = args.filter(
  (a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")
);
const deviceName = positional[0] || "ORIN-AGX-2";
const TZ = getFlag("--tz", "America/Santiago");
// dir: qué mediciones cuentan para el histograma/total. "0" = in (default), "1" = out, "all" = ambas.
const DIR = getFlag("--dir", "0");

const connectionString =
  process.env.DATABASE_URL_POOLER ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "✖ Falta DATABASE_URL (o DATABASE_URL_POOLER). Crea my-project/.env.local con la cadena de conexión."
  );
  process.exit(1);
}

// Bins de calibre: floor(perimeter) de 4 a 34  →  "Calibre 4-5 cm" ... "Calibre 34-35 cm"
const BIN_MIN = 4;
const BIN_MAX = 34;
const bins: number[] = [];
for (let b = BIN_MIN; b <= BIN_MAX; b++) bins.push(b);

const dirFilter =
  DIR === "all" ? "" : `AND c.direction = ${DIR === "1" ? 1 : 0}`;

async function main() {
  const sql = postgres(connectionString!, { max: 4, idle_timeout: 10 });

  // 1. Resolver dispositivo
  const [device] = await sql<{ id: string; nombre: string }[]>`
    SELECT id, nombre FROM dispositivo WHERE nombre = ${deviceName} LIMIT 1
  `;
  if (!device) {
    console.error(`✖ No existe dispositivo con nombre "${deviceName}".`);
    const all = await sql<{ nombre: string }[]>`SELECT nombre FROM dispositivo ORDER BY nombre`;
    console.error("Dispositivos disponibles:", all.map((d) => d.nombre).join(", "));
    await sql.end();
    process.exit(1);
  }

  // 2. Ventanas (sesiones) del dispositivo + contexto del lote
  //    Ventana = row_number por lote ordenado por start_time.
  const sessions = await sql<
    {
      session_id: string;
      lote_id: string;
      codigo_lote: string | null;
      ventana: number;
      producto: string | null;
      variedad: string | null;
      subvariedad: string | null;
      inicio: string;
      termino: string | null;
      duracion_min: number | null;
    }[]
  >`
    SELECT
      s.id                                              AS session_id,
      s.lote_id                                         AS lote_id,
      l.codigo_lote                                     AS codigo_lote,
      ROW_NUMBER() OVER (
        PARTITION BY s.lote_id ORDER BY s.start_time
      )::int                                            AS ventana,
      p.nombre                                          AS producto,
      v.nombre                                          AS variedad,
      sv.nombre                                         AS subvariedad,
      to_char(s.start_time AT TIME ZONE ${TZ}, 'YYYY-MM-DD HH24:MI') AS inicio,
      to_char(s.end_time   AT TIME ZONE ${TZ}, 'YYYY-MM-DD HH24:MI') AS termino,
      ROUND(EXTRACT(EPOCH FROM (COALESCE(s.end_time, now()) - s.start_time)) / 60)::int AS duracion_min
    FROM lote_session s
    JOIN lote l            ON l.id = s.lote_id
    LEFT JOIN variedad v   ON v.id = l.variedad_id
    LEFT JOIN producto p   ON p.id = v.producto_id
    LEFT JOIN subvariedad sv ON sv.id = l.subvariedad_id
    WHERE s.dispositivo_id = ${device.id}
    ORDER BY s.start_time
  `;

  if (sessions.length === 0) {
    console.error(`✖ El dispositivo "${deviceName}" no tiene sesiones (lote_session).`);
    await sql.end();
    process.exit(1);
  }

  // 3. Histograma + total + stddev por sesión.
  //    Cada conteo se atribuye a la sesión del dispositivo cuyo
  //    [start_time, end_time) contiene c.ts (sesiones secuenciales no se solapan).
  const hist = await sql<
    { session_id: string; bin: number; cnt: number }[]
  >`
    SELECT s.id AS session_id, floor(c.perimeter)::int AS bin, COUNT(*)::int AS cnt
    FROM conteo c
    JOIN lote_session s
      ON s.dispositivo_id = c.dispositivo_id
     AND c.ts >= s.start_time
     AND (s.end_time IS NULL OR c.ts < s.end_time)
    WHERE c.dispositivo_id = ${device.id}
      AND c.perimeter IS NOT NULL
      ${sql.unsafe(dirFilter)}
    GROUP BY s.id, floor(c.perimeter)
  `;

  const stats = await sql<
    { session_id: string; total: number; stddev: number | null }[]
  >`
    SELECT s.id AS session_id,
           COUNT(*)::int AS total,
           stddev_samp(c.perimeter) AS stddev
    FROM conteo c
    JOIN lote_session s
      ON s.dispositivo_id = c.dispositivo_id
     AND c.ts >= s.start_time
     AND (s.end_time IS NULL OR c.ts < s.end_time)
    WHERE c.dispositivo_id = ${device.id}
      AND c.perimeter IS NOT NULL
      ${sql.unsafe(dirFilter)}
    GROUP BY s.id
  `;

  const histMap = new Map<string, Map<number, number>>();
  for (const r of hist) {
    if (!histMap.has(r.session_id)) histMap.set(r.session_id, new Map());
    histMap.get(r.session_id)!.set(r.bin, r.cnt);
  }
  const statsMap = new Map(stats.map((s) => [s.session_id, s]));

  // 4. Construir filas con el orden de columnas del CSV original.
  const header = [
    "Lote",
    "Ventana",
    "Dispositivo",
    "Session ID",
    "Producto",
    "Variedad",
    "Subvariedad",
    "Horario inicio",
    "Horario termino",
    "Duracion (min)",
    "Desviacion estandar",
    "Conteo total",
    ...bins.map((b) => `Calibre ${b}-${b + 1} cm`),
  ];

  const rows: (string | number | null)[][] = [header];

  for (const s of sessions) {
    const st = statsMap.get(s.session_id);
    const h = histMap.get(s.session_id) ?? new Map<number, number>();
    const total = st?.total ?? 0;
    const stddev =
      st?.stddev != null ? Number(Number(st.stddev).toFixed(3)) : "";

    rows.push([
      s.codigo_lote ?? "",
      s.ventana,
      device.nombre,
      s.session_id,
      s.producto ?? "",
      s.variedad ?? "",
      s.subvariedad ?? "",
      s.inicio,
      s.termino ?? "",
      s.duracion_min ?? "",
      stddev,
      total,
      ...bins.map((b) => h.get(b) ?? 0),
    ]);
  }

  // 5. Escribir .xlsx (números como números, listos para análisis).
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ventanas");

  const stamp = new Date()
    .toISOString()
    .replace(/[:T]/g, "-")
    .slice(0, 19);
  const outName = `${device.nombre}_ventanas_${stamp}.xlsx`;
  const outPath = path.resolve(process.cwd(), outName);
  XLSX.writeFile(wb, outPath);

  console.log(`✔ ${sessions.length} ventanas exportadas`);
  console.log(`✔ Dispositivo: ${device.nombre}  |  TZ: ${TZ}  |  direction: ${DIR}`);
  console.log(`✔ Archivo: ${outPath}`);

  await sql.end();
}

main().catch((err) => {
  console.error("✖ Error:", err);
  process.exit(1);
});
