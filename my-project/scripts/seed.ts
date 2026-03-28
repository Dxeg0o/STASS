import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const connectionString =
  process.env.DATABASE_URL_POOLER ?? process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

// IDs fijos conocidos (Qualiblick y Agrobulbs son las empresas reales)
const QUALIBLICK_ID = "8a3e2f59-615c-4125-955f-d47757712774";
const AGROBULBS_ID = "9e929713-362a-4bd5-b21b-e079a466a679";

const SERVICIOS_QUALIBLICK = [
  "0acfd0a6-95a6-4a8f-88d5-eac3ad8441d2", // TEST
  "3be23065-8c00-4e1e-a4f3-5ed45c5aa2b7", // Pruebas 20 de Enero
  "f9717c6c-871e-4ab2-bf11-d95226621a3f", // Pruebas 20 Febrero (NL) → usaCajas
];

const SERVICIOS_AGROBULBS = [
  "75a883d0-b608-496f-a15a-f6dbbab027ee", // TEST2
  "d1a6aee9-87f0-4170-ac7c-af9e78697eee", // default_service
];

// Lote sessions existentes (para caja_lote_session)
const LOTE_SESSIONS_PARA_CAJAS = [
  {
    id: "7e052098-6145-43bc-9507-89db3ca5f7dc",
    start: new Date("2026-02-26T15:36:20Z"),
    end: new Date("2026-03-13T20:14:25Z"),
  },
  {
    id: "f0a1386c-5744-4a96-8569-650b1b37d60d",
    start: new Date("2026-02-26T15:18:16Z"),
    end: new Date("2026-02-26T15:36:20Z"),
  },
  {
    id: "60fcfdac-28cd-43d9-acad-da9d5873c8a0",
    start: new Date("2026-02-26T14:47:33Z"),
    end: new Date("2026-02-26T15:18:16Z"),
  },
  {
    id: "092b774c-9781-4be6-8d1a-4e196bf4b63f",
    start: new Date("2026-02-26T13:36:19Z"),
    end: new Date("2026-02-26T14:47:33Z"),
  },
  {
    id: "1330debe-caf8-4efb-ad08-ec54e325383e",
    start: new Date("2026-02-24T10:19:15Z"),
    end: new Date("2026-02-24T15:14:51Z"),
  },
  {
    id: "24a83f57-939f-45de-99d2-c82c2c8ff8f6",
    start: new Date("2026-02-24T08:35:26Z"),
    end: new Date("2026-02-24T10:19:15Z"),
  },
];

const AGX_ORIN_ID = "6ae37bf1-e415-4a84-9324-ea34fbf31cfc";

// Distribución de calibres típica para bulbos de Lilium (perimeter en cm)
const CALIBRE_DISTRIBUTION = [
  { calibre: 8.0, weight: 2 },
  { calibre: 9.0, weight: 5 },
  { calibre: 10.0, weight: 8 },
  { calibre: 11.0, weight: 14 },
  { calibre: 12.0, weight: 20 },
  { calibre: 12.5, weight: 22 },
  { calibre: 13.0, weight: 18 },
  { calibre: 14.0, weight: 7 },
  { calibre: 14.5, weight: 3 },
  { calibre: 15.0, weight: 1 },
];

function randomCount(base: number, variance = 0.3): number {
  return Math.max(1, Math.round(base * (1 + (Math.random() - 0.5) * variance)));
}

async function seed() {
  console.log("=== Iniciando seed principal ===\n");

  // ─── 1. Ubicaciones ──────────────────────────────────────────
  console.log("1. Creando ubicaciones...");

  const ubicacionesData = [
    {
      nombre: "Planta de Proceso Central",
      empresaId: QUALIBLICK_ID,
      tipo: "planta",
      lat: -36.8201,
      lng: -73.0444,
    },
    {
      nombre: "Bodega Fría Norte",
      empresaId: QUALIBLICK_ID,
      tipo: "bodega",
      lat: -36.8195,
      lng: -73.043,
    },
    {
      nombre: "Campo El Arrayán",
      empresaId: AGROBULBS_ID,
      tipo: "campo",
      lat: -36.905,
      lng: -72.987,
    },
    {
      nombre: "Planta de Calibración Agrobulbs",
      empresaId: AGROBULBS_ID,
      tipo: "planta",
      lat: -36.902,
      lng: -72.99,
    },
    {
      nombre: "Bodega General",
      empresaId: AGROBULBS_ID,
      tipo: "bodega",
      lat: -36.9,
      lng: -72.985,
    },
  ];

  const ubicaciones: Record<string, string> = {};
  for (const u of ubicacionesData) {
    const [row] = await db
      .insert(schema.ubicacion)
      .values(u)
      .returning({ id: schema.ubicacion.id, nombre: schema.ubicacion.nombre });
    ubicaciones[u.nombre] = row.id;
    console.log(`  ✓ ${u.tipo.toUpperCase()}: ${u.nombre}`);
  }

  // ─── 2. Tipos de Proceso ──────────────────────────────────────
  console.log("\n2. Creando tipos de proceso...");

  const tiposProcesoData = [
    { nombre: "Cosecha", empresaId: QUALIBLICK_ID },
    { nombre: "Limpieza y Lavado", empresaId: QUALIBLICK_ID },
    { nombre: "Calibración y Selección", empresaId: QUALIBLICK_ID },
    { nombre: "Embalaje", empresaId: QUALIBLICK_ID },
    { nombre: "Cosecha", empresaId: AGROBULBS_ID },
    { nombre: "Limpieza y Lavado", empresaId: AGROBULBS_ID },
    { nombre: "Calibración y Selección", empresaId: AGROBULBS_ID },
    { nombre: "Embalaje", empresaId: AGROBULBS_ID },
  ];

  const tiposProceso: { id: string; nombre: string; empresaId: string }[] = [];
  for (const t of tiposProcesoData) {
    const [row] = await db
      .insert(schema.tipoProceso)
      .values(t)
      .returning();
    tiposProceso.push(row);
    console.log(`  ✓ [${t.empresaId === QUALIBLICK_ID ? "Qualiblick" : "Agrobulbs"}] ${t.nombre}`);
  }

  const getTP = (nombre: string, empresaId: string) =>
    tiposProceso.find((t) => t.nombre === nombre && t.empresaId === empresaId)!;

  // ─── 3. Workflows ─────────────────────────────────────────────
  console.log("\n3. Creando workflows...");

  const [wfQualiblick] = await db
    .insert(schema.workflowEmpresa)
    .values({ nombre: "Proceso Estándar Lilium", empresaId: QUALIBLICK_ID })
    .returning();

  const [wfAgrobulbs] = await db
    .insert(schema.workflowEmpresa)
    .values({ nombre: "Proceso Estándar Bulbos", empresaId: AGROBULBS_ID })
    .returning();

  console.log(`  ✓ Workflow Qualiblick: ${wfQualiblick.nombre}`);
  console.log(`  ✓ Workflow Agrobulbs: ${wfAgrobulbs.nombre}`);

  // ─── 4. Workflow Pasos ────────────────────────────────────────
  console.log("\n4. Creando pasos de workflow...");

  const pasosQualiblick = [
    { workflowEmpresaId: wfQualiblick.id, tipoProcesoId: getTP("Cosecha", QUALIBLICK_ID).id, orden: 1 },
    { workflowEmpresaId: wfQualiblick.id, tipoProcesoId: getTP("Limpieza y Lavado", QUALIBLICK_ID).id, orden: 2 },
    { workflowEmpresaId: wfQualiblick.id, tipoProcesoId: getTP("Calibración y Selección", QUALIBLICK_ID).id, orden: 3 },
    { workflowEmpresaId: wfQualiblick.id, tipoProcesoId: getTP("Embalaje", QUALIBLICK_ID).id, orden: 4 },
  ];

  const pasosAgrobulbs = [
    { workflowEmpresaId: wfAgrobulbs.id, tipoProcesoId: getTP("Cosecha", AGROBULBS_ID).id, orden: 1 },
    { workflowEmpresaId: wfAgrobulbs.id, tipoProcesoId: getTP("Limpieza y Lavado", AGROBULBS_ID).id, orden: 2 },
    { workflowEmpresaId: wfAgrobulbs.id, tipoProcesoId: getTP("Calibración y Selección", AGROBULBS_ID).id, orden: 3 },
    { workflowEmpresaId: wfAgrobulbs.id, tipoProcesoId: getTP("Embalaje", AGROBULBS_ID).id, orden: 4 },
  ];

  for (const p of [...pasosQualiblick, ...pasosAgrobulbs]) {
    await db.insert(schema.workflowPaso).values(p);
  }
  console.log(`  ✓ 4 pasos para Qualiblick (Cosecha → Limpieza → Calibración → Embalaje)`);
  console.log(`  ✓ 4 pasos para Agrobulbs (Cosecha → Limpieza → Calibración → Embalaje)`);

  // ─── 5. Procesos ──────────────────────────────────────────────
  console.log("\n5. Creando procesos...");

  // Procesos Qualiblick (temporada 2025-2026)
  const [procCosechaQ] = await db.insert(schema.proceso).values({
    tipoProcesoId: getTP("Cosecha", QUALIBLICK_ID).id,
    empresaId: QUALIBLICK_ID,
    temporada: "2025-2026",
    estado: "completado",
    fechaInicio: new Date("2025-10-01"),
    fechaFin: new Date("2025-11-30"),
    notas: "Cosecha temporada otoño 2025. Rendimiento normal.",
  }).returning();

  const [procLimpiezaQ] = await db.insert(schema.proceso).values({
    tipoProcesoId: getTP("Limpieza y Lavado", QUALIBLICK_ID).id,
    empresaId: QUALIBLICK_ID,
    temporada: "2025-2026",
    estado: "completado",
    fechaInicio: new Date("2025-11-15"),
    fechaFin: new Date("2026-01-10"),
    notas: "Limpieza y desinfección de bulbos post-cosecha.",
  }).returning();

  const [procCalibracionQ] = await db.insert(schema.proceso).values({
    tipoProcesoId: getTP("Calibración y Selección", QUALIBLICK_ID).id,
    empresaId: QUALIBLICK_ID,
    temporada: "2025-2026",
    estado: "en_curso",
    fechaInicio: new Date("2026-01-20"),
    notas: "Calibración y selección por tamaño. Líneas de conteo activas.",
  }).returning();

  const [procEmbalajeQ] = await db.insert(schema.proceso).values({
    tipoProcesoId: getTP("Embalaje", QUALIBLICK_ID).id,
    empresaId: QUALIBLICK_ID,
    temporada: "2025-2026",
    estado: "planificado",
    notas: "Embalaje para exportación. Inicio estimado marzo 2026.",
  }).returning();

  console.log(`  ✓ Qualiblick: Cosecha (completado), Limpieza (completado), Calibración (en_curso), Embalaje (planificado)`);

  // Procesos Agrobulbs (temporada 2025-2026)
  const [procCosechaA] = await db.insert(schema.proceso).values({
    tipoProcesoId: getTP("Cosecha", AGROBULBS_ID).id,
    empresaId: AGROBULBS_ID,
    temporada: "2025-2026",
    estado: "completado",
    fechaInicio: new Date("2025-09-15"),
    fechaFin: new Date("2025-11-20"),
    notas: "Cosecha campo El Arrayán. Buenas condiciones climáticas.",
  }).returning();

  const [procLimpiezaA] = await db.insert(schema.proceso).values({
    tipoProcesoId: getTP("Limpieza y Lavado", AGROBULBS_ID).id,
    empresaId: AGROBULBS_ID,
    temporada: "2025-2026",
    estado: "completado",
    fechaInicio: new Date("2025-11-01"),
    fechaFin: new Date("2025-12-15"),
  }).returning();

  const [procCalibracionA] = await db.insert(schema.proceso).values({
    tipoProcesoId: getTP("Calibración y Selección", AGROBULBS_ID).id,
    empresaId: AGROBULBS_ID,
    temporada: "2025-2026",
    estado: "en_curso",
    fechaInicio: new Date("2026-01-05"),
    notas: "Líneas de conteo en operación.",
  }).returning();

  const [procEmbalajeA] = await db.insert(schema.proceso).values({
    tipoProcesoId: getTP("Embalaje", AGROBULBS_ID).id,
    empresaId: AGROBULBS_ID,
    temporada: "2025-2026",
    estado: "planificado",
  }).returning();

  console.log(`  ✓ Agrobulbs: Cosecha (completado), Limpieza (completado), Calibración (en_curso), Embalaje (planificado)`);

  // ─── 6. Vincular servicios a procesos ─────────────────────────
  console.log("\n6. Vinculando servicios a procesos de calibración...");

  for (const sId of SERVICIOS_QUALIBLICK) {
    await db
      .update(schema.servicio)
      .set({ procesoId: procCalibracionQ.id })
      .where(eq(schema.servicio.id, sId));
  }

  for (const sId of SERVICIOS_AGROBULBS) {
    await db
      .update(schema.servicio)
      .set({ procesoId: procCalibracionA.id })
      .where(eq(schema.servicio.id, sId));
  }

  // Marcar "Pruebas 20 Febrero (NL)" como usaCajas y asignar ubicación
  await db
    .update(schema.servicio)
    .set({
      usaCajas: true,
      ubicacionId: ubicaciones["Planta de Proceso Central"],
    })
    .where(eq(schema.servicio.id, "f9717c6c-871e-4ab2-bf11-d95226621a3f"));

  // Asignar ubicaciones a otros servicios
  await db
    .update(schema.servicio)
    .set({ ubicacionId: ubicaciones["Planta de Proceso Central"] })
    .where(eq(schema.servicio.id, "3be23065-8c00-4e1e-a4f3-5ed45c5aa2b7"));

  await db
    .update(schema.servicio)
    .set({ ubicacionId: ubicaciones["Planta de Calibración Agrobulbs"] })
    .where(eq(schema.servicio.id, "d1a6aee9-87f0-4170-ac7c-af9e78697eee"));

  console.log(`  ✓ 3 servicios Qualiblick → Calibración Qualiblick`);
  console.log(`  ✓ 2 servicios Agrobulbs → Calibración Agrobulbs`);
  console.log(`  ✓ "Pruebas 20 Febrero (NL)" marcado como usaCajas=true`);

  // ─── 7. Cajas ─────────────────────────────────────────────────
  console.log("\n7. Creando cajas...");

  const cajasData = Array.from({ length: 24 }, (_, i) => ({
    codigo: `QB-${String(i + 1).padStart(3, "0")}`,
    empresaId: QUALIBLICK_ID,
    tipo: i < 20 ? "reutilizable" : "descartable",
    capacidad: i < 10 ? 500 : i < 20 ? 250 : 100,
    activa: i < 22, // últimas 2 inactivas (en mantención)
  }));

  const cajas: { id: string; codigo: string }[] = [];
  for (const c of cajasData) {
    const [row] = await db
      .insert(schema.caja)
      .values(c)
      .onConflictDoNothing()
      .returning({ id: schema.caja.id, codigo: schema.caja.codigo });
    if (row) cajas.push(row);
  }
  console.log(`  ✓ ${cajas.length} cajas creadas (QB-001 a QB-024)`);
  console.log(`    • 10 cajas de 500 unidades (reutilizable)`);
  console.log(`    • 10 cajas de 250 unidades (reutilizable)`);
  console.log(`    • 4 cajas de 100 unidades (descartable, últimas 2 inactivas)`);

  // ─── 8. Caja Lote Sessions ────────────────────────────────────
  console.log("\n8. Creando caja_lote_sessions...");

  // Asignar 2-3 cajas por lote session, con rotación
  let cajaIndex = 0;
  const cajaLoteSessions: { id: string; cajaId: string; loteSessionId: string; start: Date; end: Date | null }[] = [];

  for (const sess of LOTE_SESSIONS_PARA_CAJAS) {
    // Cada sesión usa 2 cajas (simulando llenado secuencial)
    const numCajas = sess.id === "7e052098-6145-43bc-9507-89db3ca5f7dc" ? 3 : 2;

    for (let j = 0; j < numCajas; j++) {
      const caja = cajas[cajaIndex % cajas.length];
      cajaIndex++;

      const sessionDuration = sess.end
        ? sess.end.getTime() - sess.start.getTime()
        : 3600_000;
      const segmentStart = new Date(sess.start.getTime() + (j * sessionDuration) / numCajas);
      const segmentEnd =
        j < numCajas - 1 || sess.end
          ? new Date(sess.start.getTime() + ((j + 1) * sessionDuration) / numCajas)
          : null;

      const [cls] = await db
        .insert(schema.cajaLoteSession)
        .values({
          cajaId: caja.id,
          loteSessionId: sess.id,
          asignadoAt: segmentStart,
          retiradoAt: segmentEnd,
        })
        .returning();

      cajaLoteSessions.push({
        id: cls.id,
        cajaId: caja.id,
        loteSessionId: sess.id,
        start: segmentStart,
        end: segmentEnd,
      });
    }
  }

  console.log(`  ✓ ${cajaLoteSessions.length} caja_lote_sessions creadas`);

  // ─── 9. Caja Stats ────────────────────────────────────────────
  console.log("\n9. Creando caja_stats...");

  let totalCajaStats = 0;
  for (const cls of cajaLoteSessions) {
    const totalPorCaja = 150 + Math.floor(Math.random() * 200); // 150-350 bulbos por caja
    const totalWeight = CALIBRE_DISTRIBUTION.reduce((s, d) => s + d.weight, 0);

    for (const { calibre, weight } of CALIBRE_DISTRIBUTION) {
      const countOut = Math.round((weight / totalWeight) * totalPorCaja);
      if (countOut === 0) continue;

      await db.insert(schema.cajaStats).values({
        cajaLoteSessionId: cls.id,
        dispositivoId: AGX_ORIN_ID,
        calibre,
        countIn: 0,
        countOut,
        firstTs: cls.start,
        lastTs: cls.end ?? new Date(),
      }).onConflictDoNothing();

      totalCajaStats++;
    }
  }
  console.log(`  ✓ ${totalCajaStats} filas de caja_stats generadas`);

  // ─── Resumen final ────────────────────────────────────────────
  console.log("\n=== Seed completado exitosamente ===");
  console.log(`
Resumen:
  • ${ubicacionesData.length} ubicaciones
  • ${tiposProcesoData.length} tipos de proceso (4 por empresa)
  • 2 workflows con 4 pasos cada uno
  • 8 procesos (4 por empresa, temporada 2025-2026)
  • 5 servicios vinculados a procesos de calibración
  • ${cajas.length} cajas (QB-001 a QB-024)
  • ${cajaLoteSessions.length} caja_lote_sessions
  • ${totalCajaStats} caja_stats
`);

  await client.end();
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
