/**
 * Script de migración: MongoDB → PostgreSQL (Supabase)
 *
 * Orden de migración:
 *   1. empresa
 *   2. usuario + empresa_usuario
 *   3. servicio
 *   4. dispositivo  (extraído de conteo.dispositivo)
 *   5. dispositivo_servicio
 *   6. lote
 *   7. lote_session  (de LoteActivity, enriquecido con servicio_id y dispositivo_id)
 *   8. conteo        (batches de 5 000)
 *
 * Ejecutar:
 *   npx tsx scripts/migrate-data.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { randomUUID } from "crypto";
import * as schema from "../src/db/schema";

// ─── Conexiones ────────────────────────────────────────────

const MONGO_URI = process.env.MONGODB_URI!;
const PG_URL = process.env.DATABASE_URL_POOLER ?? process.env.DATABASE_URL!;

const pgClient = postgres(PG_URL, { max: 5 });
const db = drizzle(pgClient, { schema });

// ─── Modelos Mongoose (definidos inline para no depender de Next.js) ──

const EmpresaSchema = new mongoose.Schema(
  { _id: { type: String }, nombre: String, pais: String, fechaRegistro: Date },
  { _id: false }
);
const UserSchema = new mongoose.Schema(
  {
    _id: { type: String },
    nombre: String,
    correo: String,
    empresaId: String,
    rol: String,
    fechaRegistro: Date,
    contraseña: String,
  },
  { _id: false }
);
const ServicioSchema = new mongoose.Schema({ nombre: String, empresaId: String });
const LoteSchema = new mongoose.Schema({
  nombre: String,
  fechaCreacion: Date,
  servicioId: String,
});
const LoteActivitySchema = new mongoose.Schema({
  loteId: { type: mongoose.Schema.Types.ObjectId, ref: "Lote" },
  startTime: Date,
  endTime: Date,
});
const ConteoSchema = new mongoose.Schema({
  id: Number,
  perimeter: Number,
  direction: String,
  timestamp: Date,
  dispositivo: String,
  servicioId: String,
});

const EmpresaModel =
  mongoose.models.Empresa || mongoose.model("Empresa", EmpresaSchema);
const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
const ServicioModel =
  mongoose.models.Servicio || mongoose.model("Servicio", ServicioSchema);
const LoteModel =
  mongoose.models.Lote || mongoose.model("Lote", LoteSchema);
const LoteActivityModel =
  mongoose.models.LoteActivity ||
  mongoose.model("LoteActivity", LoteActivitySchema);
const ConteoModel =
  mongoose.models.Conteo || mongoose.model("Conteo", ConteoSchema);

// ─── Mapas de IDs ──────────────────────────────────────────

const empresaMap = new Map<string, string>(); // mongo _id → uuid
const usuarioMap = new Map<string, string>();
const servicioMap = new Map<string, string>(); // mongo ObjectId.toString() → uuid
const dispositivoMap = new Map<string, string>(); // nombre → uuid
const loteMap = new Map<string, string>(); // mongo ObjectId.toString() → uuid

// ─── Helpers ───────────────────────────────────────────────

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function resetAllTables() {
  // Limpiar en orden inverso de dependencias (leafs primero)
  const tables = [
    "conteo",
    "lote_session",
    "dispositivo_servicio",
    "lote",
    "variedad",
    "producto",
    "servicio",
    "ubicacion",
    "empresa_usuario",
    "dispositivo",
    "usuario",
    "empresa",
  ];
  for (const t of tables) {
    await pgClient.unsafe(`DELETE FROM "${t}"`);
  }
  log("  🗑️  Tablas limpiadas");
}

async function clearTable(_name: string) {
  // no-op: el reset se hace al inicio en resetAllTables()
}

// ─── Paso 1: Empresas ──────────────────────────────────────

async function migrateEmpresas() {
  log("📦 Migrando empresas...");
  const docs = await EmpresaModel.find({}).lean();

  if (docs.length === 0) {
    log("  ⚠️  Sin empresas en MongoDB");
    return;
  }

  await clearTable("empresa");

  const rows = docs.map((d: any) => {
    const uuid = randomUUID();
    empresaMap.set(d._id.toString(), uuid);
    return {
      id: uuid,
      nombre: d.nombre as string,
      pais: (d.pais as string) ?? null,
      createdAt: (d.fechaRegistro as Date) ?? new Date(),
    };
  });

  await db.insert(schema.empresa).values(rows);
  log(`  ✅ ${rows.length} empresas insertadas`);
}

// ─── Paso 2: Usuarios + empresa_usuario ────────────────────

async function migrateUsuarios() {
  log("👤 Migrando usuarios...");
  const docs = await UserModel.find({}).lean();

  if (docs.length === 0) {
    log("  ⚠️  Sin usuarios en MongoDB");
    return;
  }

  await clearTable("empresa_usuario");
  await clearTable("usuario");

  const usuarioRows = docs.map((d: any) => {
    const uuid = randomUUID();
    usuarioMap.set(d._id.toString(), uuid);
    return {
      id: uuid,
      nombre: d.nombre as string,
      correo: d.correo as string,
      password: d.contraseña as string,
      createdAt: (d.fechaRegistro as Date) ?? new Date(),
    };
  });

  await db.insert(schema.usuario).values(usuarioRows);
  log(`  ✅ ${usuarioRows.length} usuarios insertados`);

  // empresa_usuario
  const euRows = docs
    .filter((d: any) => d.empresaId && empresaMap.has(d.empresaId.toString()))
    .map((d: any) => {
      const empresaUuid = empresaMap.get(d.empresaId.toString());
      if (!empresaUuid) {
        log(`  ⚠️  empresaId ${d.empresaId} no encontrado para usuario ${d._id}`);
        return null;
      }
      return {
        usuarioId: usuarioMap.get(d._id.toString())!,
        empresaId: empresaUuid,
        rol: (d.rol as string) ?? "usuario",
      };
    })
    .filter(Boolean) as Array<{ usuarioId: string; empresaId: string; rol: string }>;

  if (euRows.length > 0) {
    await db.insert(schema.empresaUsuario).values(euRows);
    log(`  ✅ ${euRows.length} relaciones empresa_usuario insertadas`);
  }
}

// ─── Paso 3: Servicios ─────────────────────────────────────

async function migrateServicios() {
  log("⚙️  Migrando servicios...");
  const docs = await ServicioModel.find({}).lean();

  if (docs.length === 0) {
    log("  ⚠️  Sin servicios en MongoDB");
    return;
  }

  await clearTable("servicio");

  const rows = docs.map((d: any) => {
    const uuid = randomUUID();
    servicioMap.set(d._id.toString(), uuid);
    const empresaUuid = empresaMap.get(d.empresaId?.toString() ?? "");
    return {
      id: uuid,
      nombre: d.nombre as string,
      empresaId: empresaUuid ?? randomUUID(), // fallback si no existe la empresa
      tipo: "linea_conteo" as const,
      fechaInicio: new Date(),
    };
  });

  await db.insert(schema.servicio).values(rows);
  log(`  ✅ ${rows.length} servicios insertados`);
}

// ─── Paso 4: Dispositivos ──────────────────────────────────

async function migrateDispositivos() {
  log("📡 Extrayendo dispositivos únicos de conteos...");
  const distinct = await ConteoModel.distinct("dispositivo");

  if (distinct.length === 0) {
    log("  ⚠️  Sin dispositivos en conteos");
    return;
  }

  await clearTable("dispositivo_servicio");
  await clearTable("dispositivo");

  const rows = (distinct as string[]).map((nombre) => {
    const uuid = randomUUID();
    dispositivoMap.set(nombre, uuid);
    return { id: uuid, nombre, tipo: "nvidia_agx", activo: true };
  });

  await db.insert(schema.dispositivo).values(rows);
  log(`  ✅ ${rows.length} dispositivos insertados`);
}

// ─── Paso 5: dispositivo_servicio ──────────────────────────

async function migrateDispositivoServicio() {
  log("🔗 Construyendo relaciones dispositivo_servicio...");

  // Extraer pares únicos (dispositivo, servicioId) de conteos
  const pairs = await ConteoModel.aggregate([
    { $group: { _id: { dispositivo: "$dispositivo", servicioId: "$servicioId" } } },
  ]);

  if (pairs.length === 0) {
    log("  ⚠️  Sin pares dispositivo/servicio en conteos");
    return;
  }

  const rows = pairs
    .map((p: any) => {
      const dispositivoId = dispositivoMap.get(p._id.dispositivo);
      const servicioId = servicioMap.get(p._id.servicioId?.toString() ?? "");
      if (!dispositivoId || !servicioId) return null;
      return { dispositivoId, servicioId };
    })
    .filter(Boolean) as Array<{ dispositivoId: string; servicioId: string }>;

  if (rows.length > 0) {
    // Insertar de a uno para manejar duplicados
    for (const row of rows) {
      await db
        .insert(schema.dispositivoServicio)
        .values(row)
        .onConflictDoNothing();
    }
    log(`  ✅ ${rows.length} relaciones dispositivo_servicio insertadas`);
  }
}

// ─── Paso 6: Lotes ─────────────────────────────────────────

async function migrateLotes() {
  log("📋 Migrando lotes...");
  const docs = await LoteModel.find({}).lean();

  if (docs.length === 0) {
    log("  ⚠️  Sin lotes en MongoDB");
    return;
  }

  await clearTable("lote");

  const rows = docs.map((d: any) => {
    const uuid = randomUUID();
    loteMap.set(d._id.toString(), uuid);
    const servicioId = servicioMap.get(d.servicioId?.toString() ?? "");
    return {
      id: uuid,
      nombre: d.nombre as string,
      servicioId: servicioId ?? randomUUID(),
      createdAt: (d.fechaCreacion as Date) ?? new Date(),
    };
  });

  await db.insert(schema.lote).values(rows);
  log(`  ✅ ${rows.length} lotes insertados`);
}

// ─── Paso 7: LoteActivity → lote_session ──────────────────

async function migrateLoteSessions() {
  log("📅 Migrando lote sessions...");
  const docs = await LoteActivityModel.find({}).lean();

  if (docs.length === 0) {
    log("  ⚠️  Sin lote activities en MongoDB");
    return;
  }

  await clearTable("lote_session");

  // Para cada session, buscar el dispositivo que tuvo conteos en ese rango
  // y obtener el servicio_id del lote
  const rows: Array<{
    loteId: string;
    dispositivoId: string;
    servicioId: string;
    startTime: Date;
    endTime: Date | null;
  }> = [];

  // Pre-cargar los lotes de Mongo con su servicioId para lookup rápido
  const loteDocs = await LoteModel.find({}).lean();
  const loteToServicio = new Map<string, string>();
  for (const l of loteDocs as any[]) {
    const pgServicioId = servicioMap.get(l.servicioId?.toString() ?? "");
    if (pgServicioId) loteToServicio.set(l._id.toString(), pgServicioId);
  }

  for (const doc of docs as any[]) {
    const pgLoteId = loteMap.get(doc.loteId?.toString() ?? "");
    if (!pgLoteId) continue;

    const pgServicioId = loteToServicio.get(doc.loteId?.toString() ?? "");
    if (!pgServicioId) continue;

    // Buscar el dispositivo con más conteos en este rango de tiempo
    const startTime: Date = doc.startTime ?? new Date(0);
    const endTime: Date | null = doc.endTime ?? null;

    const matchStage: any = {
      timestamp: { $gte: startTime },
    };
    if (endTime) matchStage.timestamp.$lte = endTime;

    const topDevice = await ConteoModel.aggregate([
      { $match: matchStage },
      { $group: { _id: "$dispositivo", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    const dispositivoNombre =
      topDevice.length > 0 ? topDevice[0]._id : null;
    const pgDispositivoId = dispositivoNombre
      ? dispositivoMap.get(dispositivoNombre)
      : null;

    if (!pgDispositivoId) continue;

    rows.push({
      loteId: pgLoteId,
      dispositivoId: pgDispositivoId,
      servicioId: pgServicioId,
      startTime,
      endTime,
    });
  }

  if (rows.length > 0) {
    await db.insert(schema.loteSession).values(rows);
    log(`  ✅ ${rows.length} lote sessions insertadas`);
  } else {
    log("  ⚠️  Sin lote sessions para insertar");
  }
}

// ─── Paso 8: Conteos (batches) ─────────────────────────────

async function migrateConteos() {
  log("🔢 Migrando conteos...");
  const BATCH = 5000;
  const total = await ConteoModel.countDocuments();
  log(`  Total conteos en MongoDB: ${total.toLocaleString()}`);

  if (total === 0) {
    log("  ⚠️  Sin conteos en MongoDB");
    return;
  }

  await pgClient.unsafe(`TRUNCATE TABLE "conteo"`);

  let skip = 0;
  let inserted = 0;

  while (skip < total) {
    const docs = await ConteoModel.find({})
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(BATCH)
      .lean();

    const rows = (docs as any[])
      .map((d) => {
        const pgServicioId = servicioMap.get(d.servicioId?.toString() ?? "");
        if (!pgServicioId) return null;

        const pgDispositivoId = dispositivoMap.get(d.dispositivo ?? "");
        if (!pgDispositivoId) return null;

        // Ignorar conteos sin perimeter o direction válidos
        if (d.perimeter == null || !isFinite(d.perimeter)) return null;
        if (d.direction !== "in" && d.direction !== "out") return null;

        return {
          ts: (d.timestamp as Date) ?? new Date(),
          servicioId: pgServicioId,
          loteId: "00000000-0000-0000-0000-000000000000" as string,
          dispositivoId: pgDispositivoId,
          perimeter: d.perimeter as number,
          direction: (d.direction === "in" ? 0 : 1) as number,
        };
      })
      .filter(Boolean) as any[];

    if (rows.length > 0) {
      await db.insert(schema.conteo).values(rows);
      inserted += rows.length;
    }

    skip += BATCH;
    log(
      `  → ${Math.min(skip, total).toLocaleString()} / ${total.toLocaleString()} procesados`
    );
  }

  log(`  ✅ ${inserted.toLocaleString()} conteos insertados (con lote_id pendiente)`);

  // ── Asignar lote_id desde lote_session ──
  log("  🔄 Asignando lote_id desde lote_session...");
  await pgClient.unsafe(`
    UPDATE conteo c
    SET lote_id = ls.lote_id
    FROM lote_session ls
    WHERE c.dispositivo_id = ls.dispositivo_id
      AND c.servicio_id   = ls.servicio_id
      AND c.ts >= ls.start_time
      AND (ls.end_time IS NULL OR c.ts <= ls.end_time)
      AND c.lote_id = '00000000-0000-0000-0000-000000000000'
  `);
  log("  ✅ lote_id asignado desde lote_session");
}

// ─── Validación ────────────────────────────────────────────

async function validate() {
  log("\n📊 Validación de conteos:");

  const [pgEmpresas] = await pgClient<[{ count: string }]>`SELECT count(*) FROM empresa`;
  const [pgUsuarios] = await pgClient<[{ count: string }]>`SELECT count(*) FROM usuario`;
  const [pgServicios] = await pgClient<[{ count: string }]>`SELECT count(*) FROM servicio`;
  const [pgLotes] = await pgClient<[{ count: string }]>`SELECT count(*) FROM lote`;
  const [pgSessions] = await pgClient<[{ count: string }]>`SELECT count(*) FROM lote_session`;
  const [pgConteos] = await pgClient<[{ count: string }]>`SELECT count(*) FROM conteo`;
  const [pgPendientes] = await pgClient<[{ count: string }]>`SELECT count(*) FROM conteo WHERE lote_id = '00000000-0000-0000-0000-000000000000'`;

  const mongoEmpresas = await EmpresaModel.countDocuments();
  const mongoUsuarios = await UserModel.countDocuments();
  const mongoServicios = await ServicioModel.countDocuments();
  const mongoLotes = await LoteModel.countDocuments();
  const mongoActividades = await LoteActivityModel.countDocuments();
  const mongoConteos = await ConteoModel.countDocuments();

  console.log("\n┌────────────────────┬──────────┬──────────┐");
  console.log("│ Entidad            │ MongoDB  │ PG       │");
  console.log("├────────────────────┼──────────┼──────────┤");
  console.log(`│ empresa            │ ${String(mongoEmpresas).padEnd(8)} │ ${String(pgEmpresas.count).padEnd(8)} │`);
  console.log(`│ usuario            │ ${String(mongoUsuarios).padEnd(8)} │ ${String(pgUsuarios.count).padEnd(8)} │`);
  console.log(`│ servicio           │ ${String(mongoServicios).padEnd(8)} │ ${String(pgServicios.count).padEnd(8)} │`);
  console.log(`│ lote               │ ${String(mongoLotes).padEnd(8)} │ ${String(pgLotes.count).padEnd(8)} │`);
  console.log(`│ lote_session       │ ${String(mongoActividades).padEnd(8)} │ ${String(pgSessions.count).padEnd(8)} │`);
  console.log(`│ conteo             │ ${String(mongoConteos).padEnd(8)} │ ${String(pgConteos.count).padEnd(8)} │`);
  console.log("└────────────────────┴──────────┴──────────┘");
  console.log(`\n  Conteos sin lote_id asignado: ${pgPendientes.count}`);
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  log("🚀 Iniciando migración MongoDB → PostgreSQL");

  // Cargar .env.local
  const { config } = await import("dotenv");
  config({ path: ".env.local" });

  // Conectar a MongoDB
  log("Conectando a MongoDB...");
  await mongoose.connect(MONGO_URI, {
    bufferCommands: false,
    family: 4,
    serverSelectionTimeoutMS: 20000,
  });
  log("✅ MongoDB conectado");

  try {
    await resetAllTables();
    await migrateEmpresas();
    await migrateUsuarios();
    await migrateServicios();
    await migrateDispositivos();
    await migrateDispositivoServicio();
    await migrateLotes();
    await migrateLoteSessions();
    await migrateConteos();
    await validate();
  } finally {
    await mongoose.disconnect();
    await pgClient.end();
    log("\n🏁 Migración finalizada");
  }
}

main().catch((err) => {
  console.error("❌ Error en migración:", err);
  process.exit(1);
});
