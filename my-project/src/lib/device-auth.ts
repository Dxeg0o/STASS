import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dispositivo } from "@/db/schema";

export interface DeviceIdentity {
  id: string;
  nombre: string;
  tipo: string;
}

async function hashApiKey(rawKey: string): Promise<string> {
  const encoded = new TextEncoder().encode(rawKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyDeviceKey(
  req: Request
): Promise<DeviceIdentity | null> {
  const rawKey = req.headers.get("x-device-key");
  if (!rawKey) return null;

  const hash = await hashApiKey(rawKey);

  const device = await db.query.dispositivo.findFirst({
    where: eq(dispositivo.apiKeyHash, hash),
    columns: { id: true, nombre: true, tipo: true, activo: true },
  });

  if (!device || !device.activo) return null;

  return { id: device.id, nombre: device.nombre, tipo: device.tipo };
}
