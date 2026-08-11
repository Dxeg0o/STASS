/**
 * Envia el correo de reporteria a un destinatario para revisarlo, sin pasar por
 * el cron ni tocar report_delivery.
 *
 * Por defecto lee DATOS REALES de la base. `--sample` arma un reporte de
 * muestra sin base, para revisar solo el formato.
 *
 * Uso:
 *   npx tsx --tsconfig tsconfig.preview.json scripts/send-report-preview.ts correo@dominio.cl
 *   ... correo@dominio.cl --lang es
 *   ... correo@dominio.cl --service "Planting Stock Pelu"
 *   ... --out preview.html            (renderiza el HTML en vez de enviar)
 *   ... --sample                      (datos de muestra, sin base)
 *   ... --list                        (lista servicios con conteos y su fecha)
 *
 * El --tsconfig es necesario porque el tsconfig de Next declara jsx "preserve"
 * y esbuild necesita el runtime automatico para renderizar fuera de Next.
 *
 * Requiere RESEND_API_KEY, EMAIL_FROM y DATABASE_URL(_POOLER) en .env.local.
 */
import { config } from "dotenv";
import { createRequire } from "node:module";
config({ path: ".env.local" });

// `server-only` resuelve a su entrada de cliente fuera de Next y lanza al
// importarse. Aca corremos en Node puro, asi que se neutraliza el modulo.
const requireCjs = createRequire(import.meta.url);
const Module = requireCjs("node:module") as {
  _load: (request: string, ...rest: unknown[]) => unknown;
};
const load = Module._load;
Module._load = (request: string, ...rest: unknown[]) =>
  request === "server-only" ? {} : load.call(Module, request, ...rest);

import type {
  ReportCalibreRow,
  ReportLang,
  ReportLote,
  ReportPair,
  ServiceReport,
} from "../src/lib/reporting/types";

// ─── Datos de muestra (solo con --sample) ────────────────────────────────────

const SAMPLE_DATE = "2026-08-06";

function salida(orden: number, bulbs: number): ReportCalibreRow["salidas"][number] {
  return {
    salidaOrden: orden,
    label: `Salida ${orden}`,
    dispositivoNombre: `THOR-${orden}`,
    bulbs,
    percent: 0,
  };
}

/**
 * Un rango demarcado al cerrar el lote en la tablet.
 *
 * Lleva UNA salida: dentro de un lote cada calibre pertenece a una sola salida
 * — es la salida la que corre un calibre, no al reves. Un calibre con varias
 * salidas en el mismo lote no ocurre en produccion.
 */
function calibre(
  from: number,
  to: number,
  bins: number,
  outlet: ReportCalibreRow["salidas"][number] | null
): ReportCalibreRow {
  const salidas = outlet ? [{ ...outlet, percent: 100 }] : [];
  return {
    key: `${from}:${to}`,
    label: { es: `${from}/${to}`, en: `${from}/${to}` },
    bulbs: outlet?.bulbs ?? 0,
    bins,
    percent: 0,
    declarado: true,
    salidas,
  };
}

function lote(codigoLote: string, rows: ReportCalibreRow[], mermaBulbs: number): ReportLote {
  const bulbs = rows.reduce((sum, row) => sum + row.bulbs, 0);
  return {
    loteId: codigoLote,
    codigoLote,
    variedad: "Tabledance",
    bulbs,
    percent: 0,
    mermaBulbs,
    rows: rows.map((row) => ({
      ...row,
      percent: bulbs > 0 ? Math.round((row.bulbs / bulbs) * 10000) / 100 : 0,
    })),
  };
}

function sampleReport(kind: "daily" | "total", lotes: ReportLote[]): ServiceReport {
  const totalBulbs = lotes.reduce((sum, current) => sum + current.bulbs, 0);
  return {
    kind,
    serviceId: "preview",
    serviceName: "Planting Stock Pelú (MUESTRA / SAMPLE)",
    companyName: "Vivero Demo",
    processName: "Calibrado",
    reportDate: SAMPLE_DATE,
    generatedAt: new Date().toISOString(),
    calibreSource: "declarado",
    totalBulbs,
    lotes: lotes.map((l) => ({
      ...l,
      percent: totalBulbs > 0 ? Math.round((l.bulbs / totalBulbs) * 10000) / 100 : 0,
    })),
    mermaBulbs: lotes.reduce((sum, current) => sum + current.mermaBulbs, 0),
  };
}

// Una salida por calibre. El ultimo rango se declaro pero salio en cero.
const loteA = lote(
  "L-2451",
  [
    calibre(8, 10, 14, salida(1, 5200)),
    calibre(10, 12, 9, salida(2, 4800)),
    calibre(12, 14, 3, salida(3, 1450)),
    calibre(14, 16, 0, null),
  ],
  620
);

// Rangos declarados sin bins cargados, para ver la columna vacia.
const loteB = lote(
  "L-2452",
  [calibre(8, 10, 0, salida(1, 990)), calibre(10, 12, 0, salida(2, 2340))],
  0
);

// Solo en el acumulado, y con otra escala de rangos — es justamente por esto que
// no hay resumen por calibre a nivel de servicio.
const loteC = lote(
  "L-2448",
  [calibre(9, 11, 21, salida(1, 7600)), calibre(11, 13, 12, salida(4, 6100))],
  845
);

function samplePair() {
  return {
    daily: sampleReport("daily", [loteA, loteB]),
    total: sampleReport("total", [loteC, loteA, loteB]),
    reportDate: SAMPLE_DATE,
  };
}

// ─── Datos reales ────────────────────────────────────────────────────────────

/**
 * Servicios con conteos y la fecha del ultimo conteo.
 *
 * MAX(ts) usa idx_conteo_servicio; envolverlo en (ts AT TIME ZONE ...)::date
 * obliga a un seq scan de la tabla completa (62M filas). La conversion a fecha
 * local se hace en JS con el mismo helper que usa el resto de la reporteria.
 */
async function listarServicios() {
  const { desc, eq, sql } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { conteo, empresa, servicio } = await import("../src/db/schema");
  const { formatLocalDate } = await import("../src/lib/reporting/data");

  const rows = await db
    .select({
      id: servicio.id,
      nombre: servicio.nombre,
      empresa: empresa.nombre,
      estado: servicio.estado,
      modo: servicio.modoCalibre,
      ultimoTs: sql<string | null>`MAX(${conteo.ts})`,
    })
    .from(servicio)
    .innerJoin(empresa, eq(empresa.id, servicio.empresaId))
    .innerJoin(conteo, eq(conteo.servicioId, servicio.id))
    .groupBy(servicio.id, servicio.nombre, empresa.nombre, servicio.estado, servicio.modoCalibre)
    .orderBy(desc(sql`MAX(${conteo.ts})`))
    .limit(30);

  return rows.map((row) => ({
    ...row,
    ultimaFecha: row.ultimoTs ? formatLocalDate(new Date(row.ultimoTs)) : null,
  }));
}

async function buildRealPair(serviceName: string | null, dateArg: string | null) {
  const { eq, sql } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { conteo, servicio } = await import("../src/db/schema");
  const { buildReportPair } = await import("../src/lib/reporting/dispatch");
  const { formatLocalDate } = await import("../src/lib/reporting/data");

  const servicios = await listarServicios();
  const elegido = serviceName
    ? servicios.find((s) => s.nombre.toLowerCase().includes(serviceName.toLowerCase()))
    : servicios[0];
  if (!elegido) {
    throw new Error(
      `Servicio no encontrado: ${serviceName}. Corre con --list para ver los disponibles.`
    );
  }

  const [latest] = await db
    .select({ ts: sql<string | null>`MAX(${conteo.ts})` })
    .from(conteo)
    .where(eq(conteo.servicioId, elegido.id));
  const reportDate =
    dateArg ?? (latest?.ts ? formatLocalDate(new Date(latest.ts)) : formatLocalDate());

  console.log(
    `Servicio: ${elegido.nombre} (${elegido.empresa}) | modo: ${elegido.modo} | fecha: ${reportDate}`
  );
  // buildReportPair refresca el resumen declarado y renderiza PDF y Excel en el
  // idioma de produccion; aca se reusa tal cual para no divergir del cron.
  const pair: ReportPair = await buildReportPair(elegido.id, reportDate);
  return { pair, reportDate, serviceName: elegido.nombre };
}

// ─── Main ────────────────────────────────────────────────────────────────────

function flag(args: string[], name: string) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

async function main() {
  const args = process.argv.slice(2);
  const outFile = flag(args, "--out");
  const lang: ReportLang = (flag(args, "--lang") as ReportLang) ?? "en";
  const serviceName = flag(args, "--service");
  const dateArg = flag(args, "--date");
  const useSample = args.includes("--sample");
  const recipient = args.find((arg) => arg.includes("@")) ?? null;

  if (args.includes("--list")) {
    for (const s of await listarServicios()) {
      console.log(
        `${(s.ultimaFecha ?? "-").padEnd(12)} ${s.modo.padEnd(10)} ${s.estado.padEnd(10)} ${s.empresa} / ${s.nombre}`
      );
    }
    return;
  }

  if (!recipient && !outFile) throw new Error("Falta el destinatario o --out <archivo>");

  const { renderServiceReportPdf } = await import("../src/lib/reporting/pdf");
  const { renderServiceReportWorkbook } = await import("../src/lib/reporting/xlsx");
  const { getQualiblickLogoAttachment } = await import("../src/lib/reporting/logo");
  const { sendEmail } = await import("../src/lib/email");
  const React = (await import("react")).default;
  const ServiceReportEmail = (await import("../src/emails/ServiceReportEmail")).default;

  const built = useSample
    ? { ...samplePair(), pair: null, serviceName: "MUESTRA" }
    : await buildRealPair(serviceName, dateArg);
  const daily = "pair" in built && built.pair ? built.pair.daily : (built as ReturnType<typeof samplePair>).daily;
  const total = "pair" in built && built.pair ? built.pair.total : (built as ReturnType<typeof samplePair>).total;
  const reportDate = built.reportDate;

  console.log(
    `Diario: ${daily.totalBulbs} bulbos / ${daily.lotes.length} lotes / ${daily.mermaBulbs} merma | ` +
      `Total: ${total.totalBulbs} bulbos / ${total.lotes.length} lotes`
  );

  const element = React.createElement(ServiceReportEmail, {
    daily,
    recipientName: null,
    lang,
  });

  if (outFile) {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(outFile, `<!DOCTYPE html>${renderToStaticMarkup(element)}`, "utf8");
    console.log(`Escrito ${outFile} (${lang})`);
    return;
  }

  // Los adjuntos que trae buildReportPair ya vienen en el idioma de produccion.
  // Solo se rerenderizan si se pidió otro idioma, o si son de muestra.
  const reusable = "pair" in built && built.pair && lang === "en";
  const [dailyPdf, totalPdf] = reusable
    ? [built.pair!.dailyPdf, built.pair!.totalPdf]
    : await Promise.all([
        renderServiceReportPdf(daily, lang),
        renderServiceReportPdf(total, lang),
      ]);
  const workbook = reusable
    ? built.pair!.workbook
    : renderServiceReportWorkbook(daily, total, lang);

  const tag = useSample ? "[SAMPLE]" : "[PREVIEW]";
  const suffix = lang === "es" ? " - REVISION ES" : "";

  await sendEmail({
    to: recipient!,
    subject: `${tag}${suffix} QUALIBLICK report - ${daily.serviceName} - ${reportDate}`,
    react: element,
    attachments: [
      { filename: `daily-${lang}-${reportDate}.pdf`, content: dailyPdf },
      { filename: `total-${lang}.pdf`, content: totalPdf },
      { filename: `report-${lang}-${reportDate}.xlsx`, content: workbook },
      getQualiblickLogoAttachment(),
    ],
  });
  console.log(`Enviado a ${recipient} (${lang})`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
