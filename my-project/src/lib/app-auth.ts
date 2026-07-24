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

  // Telemetría de versión (F2.6, plan de calibre por salida): fire-and-forget, nunca
  // debe bloquear ni fallar la request de autenticación por esto. El header es opcional
  // — las tablets con APK viejo simplemente no lo mandan, y last_seen_at igual se
  // actualiza. Es lo que habilita F6 (saber cuándo retirar el soporte del payload viejo
  // de /cierre-calibres): sin esto no hay forma de saber qué versión corre cada tablet.
  const appVersion = req.headers.get("x-app-version");
  void db
    .update(tablet)
    .set({ lastSeenAt: new Date(), ...(appVersion ? { appVersion } : {}) })
    .where(eq(tablet.id, found.id))
    .catch(() => {
      /* no-op: la telemetría no debe romper el request */
    });

  return { id: found.id, nombre: found.nombre };
}
