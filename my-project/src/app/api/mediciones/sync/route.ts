import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { conteo, loteServicio, loteSession } from "@/db/schema";
import { verifyDeviceKey } from "@/lib/device-auth";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface RawMedicion {
  ts: unknown;
  perimeter: unknown;
  direction: unknown;
}

interface ValidMedicion {
  ts: Date;
  perimeter: number;
  direction: 0 | 1;
}

// ── Validación ────────────────────────────────────────────────────────────────

const MAX_BATCH_SIZE = 10_000;

function validateMediciones(
  raw: unknown
): { data: ValidMedicion[] } | { error: string } {
  if (!Array.isArray(raw)) return { error: "mediciones debe ser un array" };
  if (raw.length === 0) return { error: "mediciones no puede estar vacío" };
  if (raw.length > MAX_BATCH_SIZE)
    return { error: `máximo ${MAX_BATCH_SIZE} mediciones por request` };

  const validated: ValidMedicion[] = [];

  for (let i = 0; i < raw.length; i++) {
    const m = raw[i] as RawMedicion;

    if (typeof m !== "object" || m === null)
      return { error: `medicion[${i}]: debe ser un objeto` };

    const ts = new Date(m.ts as string);
    if (isNaN(ts.getTime()))
      return { error: `medicion[${i}].ts: fecha inválida` };

    if (typeof m.perimeter !== "number" || m.perimeter <= 0)
      return { error: `medicion[${i}].perimeter: debe ser número positivo` };

    if (m.direction !== 0 && m.direction !== 1)
      return { error: `medicion[${i}].direction: debe ser 0 (in) o 1 (out)` };

    validated.push({ ts, perimeter: m.perimeter, direction: m.direction });
  }

  return { data: validated };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Autenticación del dispositivo por API key
  const device = await verifyDeviceKey(request);
  if (!device) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parsear y validar body
  let body: { mediciones?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const validation = validateMediciones(body.mediciones);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const mediciones = validation.data;

  // 3. Resolver sesión activa y servicio en una sola query con JOIN.
  //    lote_session → lote_servicio (más reciente) da el servicio_id correcto.
  const [activeSession] = await db
    .select({
      loteId: loteSession.loteId,
      servicioId: loteServicio.servicioId,
    })
    .from(loteSession)
    .innerJoin(loteServicio, eq(loteServicio.loteId, loteSession.loteId))
    .where(
      and(eq(loteSession.dispositivoId, device.id), isNull(loteSession.endTime))
    )
    .orderBy(desc(loteServicio.asignadoAt))
    .limit(1);

  if (!activeSession) {
    return NextResponse.json(
      { error: "No hay sesión de lote activa para este dispositivo" },
      { status: 409 }
    );
  }

  // 4. Bulk INSERT — un solo statement para N filas.
  //    El trigger STATEMENT-level (migración 0009) dispara UNA vez
  //    y agrega todo el batch en un único UPSERT a lote_stats.
  await db.insert(conteo).values(
    mediciones.map((m) => ({
      ts: m.ts,
      loteId: activeSession.loteId,
      servicioId: activeSession.servicioId,
      dispositivoId: device.id,
      cajaLoteSessionId: null as string | null,
      perimeter: m.perimeter,
      direction: m.direction,
    }))
  );

  return NextResponse.json({ accepted: mediciones.length }, { status: 200 });
}
