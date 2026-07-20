import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cajaLoteSession } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";
import { isUniqueViolation } from "@/lib/app-idempotent";
import { serializeCajaLoteSession } from "@/lib/app-serialize";

interface Body {
  caja_id?: unknown;
  lote_session_id?: unknown;
  id?: unknown;
  asignado_at?: unknown;
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

  if (
    typeof body.caja_id !== "string" ||
    typeof body.lote_session_id !== "string"
  ) {
    return NextResponse.json(
      { error: "caja_id y lote_session_id son requeridos" },
      { status: 400 }
    );
  }

  const asignadoAt =
    typeof body.asignado_at === "string" ? new Date(body.asignado_at) : new Date();
  if (isNaN(asignadoAt.getTime())) {
    return NextResponse.json({ error: "asignado_at inválido" }, { status: 400 });
  }

  try {
    const [created] = await db
      .insert(cajaLoteSession)
      .values({
        ...(typeof body.id === "string" ? { id: body.id } : {}),
        cajaId: body.caja_id,
        loteSessionId: body.lote_session_id,
        asignadoAt,
      })
      .returning();

    return NextResponse.json(serializeCajaLoteSession(created), { status: 201 });
  } catch (e) {
    // Reintento offline con el mismo id: idempotente.
    if (isUniqueViolation(e) && typeof body.id === "string") {
      const existing = await db.query.cajaLoteSession.findFirst({
        where: eq(cajaLoteSession.id, body.id),
      });
      if (existing) {
        return NextResponse.json(serializeCajaLoteSession(existing), { status: 200 });
      }
    }
    throw e;
  }
}
