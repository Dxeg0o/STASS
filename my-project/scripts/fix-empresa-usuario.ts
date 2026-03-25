/**
 * Parche: reconstruir empresa_usuario desde MongoDB
 * Los usuarios de MongoDB tienen empresaId (string) → busca la empresa por nombre
 * y crea la relación en PG.
 *
 * Ejecutar: npx tsx scripts/fix-empresa-usuario.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

const EmpresaSchema = new mongoose.Schema(
  { _id: { type: String }, nombre: String, pais: String },
  { _id: false }
);
const UserSchema = new mongoose.Schema(
  { _id: { type: String }, correo: String, empresaId: String, rol: String },
  { _id: false }
);

const EmpresaModel = mongoose.models.Empresa || mongoose.model("Empresa", EmpresaSchema);
const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);

async function main() {
  const MONGO_URI = process.env.MONGODB_URI!;
  const PG_URL = process.env.DATABASE_URL_POOLER ?? process.env.DATABASE_URL!;

  const pgClient = postgres(PG_URL, { max: 3 });
  const db = drizzle(pgClient, { schema });

  await mongoose.connect(MONGO_URI, { bufferCommands: false, family: 4 });
  console.log("✅ MongoDB conectado");

  const mongoEmpresas = await EmpresaModel.find({}).lean() as any[];
  const pgEmpresas = await db.select().from(schema.empresa);

  // nombre → PG uuid
  const nombreToPgId = new Map<string, string>();
  for (const e of pgEmpresas) nombreToPgId.set(e.nombre, e.id);

  // mongo _id → PG uuid (via nombre)
  const mongoIdToPgId = new Map<string, string>();
  for (const e of mongoEmpresas) {
    const pgId = nombreToPgId.get(e.nombre);
    if (pgId) mongoIdToPgId.set(e._id.toString(), pgId);
  }
  console.log(`📦 ${mongoIdToPgId.size} empresas mapeadas`);

  // correo → PG usuario uuid
  const pgUsuarios = await db.select().from(schema.usuario);
  const correoPgId = new Map<string, string>();
  for (const u of pgUsuarios) correoPgId.set(u.correo, u.id);

  const mongoUsers = await UserModel.find({}).lean() as any[];
  let inserted = 0;
  let skipped = 0;

  for (const u of mongoUsers) {
    const pgUserId = correoPgId.get(u.correo);
    if (!pgUserId) { skipped++; continue; }

    const pgEmpresaId = mongoIdToPgId.get(u.empresaId?.toString() ?? "");
    if (!pgEmpresaId) {
      console.log(`  ⚠️  sin empresa PG para ${u.correo} (mongoEmpresaId: ${u.empresaId})`);
      skipped++;
      continue;
    }

    const existing = await db.query.empresaUsuario.findFirst({
      where: (eu, { and, eq }) => and(eq(eu.usuarioId, pgUserId), eq(eu.empresaId, pgEmpresaId)),
    });
    if (existing) { skipped++; continue; }

    await db.insert(schema.empresaUsuario).values({
      usuarioId: pgUserId,
      empresaId: pgEmpresaId,
      rol: u.rol ?? "usuario",
    });
    console.log(`  ✅ ${u.correo} → ${pgEmpresaId} (${u.rol})`);
    inserted++;
  }

  console.log(`\n🏁 ${inserted} relaciones insertadas, ${skipped} omitidas`);
  await mongoose.disconnect();
  await pgClient.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
