import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loteSession } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";
import { isUniqueViolation } from "@/lib/app-idempotent";
import { serializeLoteSession } from "@/lib/app-serialize";

interface Body {
  lote_id?: unknown;
  dispositivo_id?: unknown;
  id?: unknown;
  start_time?: unknown;
}

export async function POST(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const body = raw as Body;

  if (typeof body.lote_id !== "string" || typeof body.dispositivo_id !== "string") {
    return NextResponse.json(
      { error: "lote_id y dispositivo_id son requeridos" },
      { status: 400 }
    );
  }

  const startTime =
    typeof body.start_time === "string" ? new Date(body.start_time) : new Date();
  if (isNaN(startTime.getTime())) {
    return NextResponse.json({ error: "start_time inválido" }, { status: 400 });
  }

  try {
    const [created] = await db
      .insert(loteSession)
      .values({
        ...(typeof body.id === "string" ? { id: body.id } : {}),
        loteId: body.lote_id,
        dispositivoId: body.dispositivo_id,
        startTime,
      })
      .returning();

    return NextResponse.json(serializeLoteSession(created), { status: 201 });
  } catch (e) {
    // Reintento offline con el mismo id: idempotente, se devuelve lo que ya
    // quedó guardado (no un error).
    if (isUniqueViolation(e) && typeof body.id === "string") {
      const existing = await db.query.loteSession.findFirst({
        where: eq(loteSession.id, body.id),
      });
      if (existing) {
        return NextResponse.json(serializeLoteSession(existing), { status: 200 });
      }
    }
    throw e;
  }
}
