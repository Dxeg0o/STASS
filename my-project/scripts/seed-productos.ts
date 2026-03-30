import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";

const connectionString =
  process.env.DATABASE_URL_POOLER ?? process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.log("Seeding productos y variedades...");

  // Productos
  const [lilium] = await db
    .insert(schema.producto)
    .values({ nombre: "Bulbos de Lilium" })
    .onConflictDoNothing()
    .returning();

  const [cala] = await db
    .insert(schema.producto)
    .values({ nombre: "Bulbos de Cala" })
    .onConflictDoNothing()
    .returning();

  // Si ya existían, buscarlos
  const productos = await db.select().from(schema.producto);
  const liliumId =
    lilium?.id ?? productos.find((p) => p.nombre === "Bulbos de Lilium")!.id;
  const calaId =
    cala?.id ?? productos.find((p) => p.nombre === "Bulbos de Cala")!.id;

  console.log(`Producto Lilium: ${liliumId}`);
  console.log(`Producto Cala: ${calaId}`);

  // Variedades de Lilium
  const variedadesLilium = [
    { nombre: "Asiáticas", productoId: liliumId },
    { nombre: "Orientales", productoId: liliumId },
    { nombre: "LA Híbridos", productoId: liliumId },
    { nombre: "OT Híbridos", productoId: liliumId },
    { nombre: "Longiflorum", productoId: liliumId },
  ];

  // Variedades de Cala
  const variedadesCala = [
    { nombre: "Cala Blanca", productoId: calaId },
    { nombre: "Cala de Color", productoId: calaId },
  ];

  for (const v of [...variedadesLilium, ...variedadesCala]) {
    await db.insert(schema.variedad).values(v).onConflictDoNothing();
  }

  const allVariedades = await db.select().from(schema.variedad);
  console.log(`Total variedades: ${allVariedades.length}`);
  for (const v of allVariedades) {
    console.log(`  - ${v.nombre} (producto: ${v.productoId})`);
  }

  console.log("Seed completado.");
  await client.end();
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
