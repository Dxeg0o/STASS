import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tablet } from "@/db/schema";

// Autenticación de las tablets (app Flutter de operador) contra la API.
// Espejo de device-auth.ts: la tablet manda su x-app-key en cada request,
// acá se hashea y se busca la tablet activa. Nunca se almacena el plaintext.

export interface TabletIdentity {
  id: string;
  nombre: string;
}

async function hashApiKey(rawKey: string): Promise<string> {
  const encoded = new TextEncoder().encode(rawKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyAppKey(
  req: Request
): Promise<TabletIdentity | null> {
  const rawKey = req.headers.get("x-app-key");
  if (!rawKey) return null;

  const hash = await hashApiKey(rawKey);

  const found = await db.query.tablet.findFirst({
    where: eq(tablet.apiKeyHash, hash),
    columns: { id: true, nombre: true, activo: true },
  });

  if (!found || !found.activo) return null;

  return { id: found.id, nombre: found.nombre };
}
