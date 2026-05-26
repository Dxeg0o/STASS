import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Usar pooler para la app (mejor para entornos serverless como Vercel)
const connectionString =
  process.env.DATABASE_URL_POOLER ?? process.env.DATABASE_URL!;

const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

const poolMax = Number.parseInt(
  process.env.DATABASE_POOL_MAX ?? (process.env.NODE_ENV === "production" ? "1" : "5"),
  10
);

const client =
  globalForDb.pgClient ??
  postgres(connectionString, {
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
