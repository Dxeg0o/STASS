import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { caja, cajaLoteSession, cajaStats, loteSession } from "@/db/schema";

async function resolveCajaId(input: {
  cajaId?: unknown;
  codigo?: unknown;
}): Promise<string | null> {
  if (typeof input.cajaId === "string" && input.cajaId.trim()) {
    const [found] = await db
      .select({ id: caja.id })
      .from(caja)
      .where(and(eq(caja.id, input.cajaId.trim()), eq(caja.activa, true)))
      .limit(1);

    return found?.id ?? null;
  }

  if (typeof input.codigo !== "string" || !input.codigo.trim()) {
    return null;
  }

  const [found] = await db
    .select({ id: caja.id })
    .from(caja)
    .where(and(eq(caja.codigo, input.codigo.trim()), eq(caja.activa, true)))
    .limit(1);

  return found?.id ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteSessionId = searchParams.get("loteSessionId");
  const cajaId = searchParams.get("cajaId");

  if (!loteSessionId && !cajaId) {
    return NextResponse.json(
      { error: "loteSessionId o cajaId es requerido" },
      { status: 400 }
    );
  }

  const conditions = [];
  if (loteSessionId) {
    conditions.push(eq(cajaLoteSession.loteSessionId, loteSessionId));
  }
  if (cajaId) {
    conditions.push(eq(cajaLoteSession.cajaId, cajaId));
  }

  const rows = await db
    .select({
      id: cajaLoteSession.id,
      cajaId: cajaLoteSession.cajaId,
      codigo: caja.codigo,
      loteSessionId: cajaLoteSession.loteSessionId,
      asignadoAt: cajaLoteSession.asignadoAt,
      retiradoAt: cajaLoteSession.retiradoAt,
      totalCount: sql<number>`COALESCE(SUM(${cajaStats.countIn} + ${cajaStats.countOut}), 0)::int`,
      lastTs: sql<Date | null>`MAX(${cajaStats.lastTs})`,
    })
    .from(cajaLoteSession)
    .innerJoin(caja, eq(caja.id, cajaLoteSession.cajaId))
    .leftJoin(cajaStats, eq(cajaStats.cajaLoteSessionId, cajaLoteSession.id))
    .where(and(...conditions))
    .groupBy(
      cajaLoteSession.id,
      cajaLoteSession.cajaId,
      caja.codigo,
      cajaLoteSession.loteSessionId,
      cajaLoteSession.asignadoAt,
      cajaLoteSession.retiradoAt
    );

  return NextResponse.json(
    rows.map((row) => ({
      ...row,
      asignadoAt: row.asignadoAt ? new Date(row.asignadoAt).toISOString() : null,
      retiradoAt: row.retiradoAt ? new Date(row.retiradoAt).toISOString() : null,
      lastTs: row.lastTs ? new Date(row.lastTs).toISOString() : null,
    }))
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const cajaId = await resolveCajaId(body);
  const loteSessionId =
    typeof body.loteSessionId === "string" ? body.loteSessionId.trim() : null;

  if (!cajaId || !loteSessionId) {
    return NextResponse.json(
      { error: "cajaId/codigo y loteSessionId son requeridos" },
      { status: 400 }
    );
  }

  const [session] = await db
    .select({ id: loteSession.id })
    .from(loteSession)
    .where(and(eq(loteSession.id, loteSessionId), isNull(loteSession.endTime)))
    .limit(1);

  if (!session) {
    return NextResponse.json(
      { error: "No hay una sesión de lote abierta para asignar caja" },
      { status: 409 }
    );
  }

  const [openForSession] = await db
    .select({ id: cajaLoteSession.id })
    .from(cajaLoteSession)
    .where(
      and(
        eq(cajaLoteSession.loteSessionId, loteSessionId),
        isNull(cajaLoteSession.retiradoAt)
      )
    )
    .limit(1);

  if (openForSession) {
    return NextResponse.json(
      { error: "La sesión ya tiene una caja abierta" },
      { status: 409 }
    );
  }

  const [openForCaja] = await db
    .select({ id: cajaLoteSession.id })
    .from(cajaLoteSession)
    .where(
      and(eq(cajaLoteSession.cajaId, cajaId), isNull(cajaLoteSession.retiradoAt))
    )
    .limit(1);

  if (openForCaja) {
    return NextResponse.json(
      { error: "La caja ya está abierta en otra sesión" },
      { status: 409 }
    );
  }

  const [created] = await db
    .insert(cajaLoteSession)
    .values({
      cajaId,
      loteSessionId,
      asignadoAt: new Date(),
      retiradoAt: null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const cajaLoteSessionId =
    typeof body.cajaLoteSessionId === "string"
      ? body.cajaLoteSessionId.trim()
      : null;
  const loteSessionId =
    typeof body.loteSessionId === "string" ? body.loteSessionId.trim() : null;
  const cajaId = await resolveCajaId(body);

  if (!cajaLoteSessionId && !loteSessionId && !cajaId) {
    return NextResponse.json(
      { error: "cajaLoteSessionId, loteSessionId o cajaId es requerido" },
      { status: 400 }
    );
  }

  const conditions = [isNull(cajaLoteSession.retiradoAt)];
  if (cajaLoteSessionId) {
    conditions.push(eq(cajaLoteSession.id, cajaLoteSessionId));
  }
  if (loteSessionId) {
    conditions.push(eq(cajaLoteSession.loteSessionId, loteSessionId));
  }
  if (cajaId) {
    conditions.push(eq(cajaLoteSession.cajaId, cajaId));
  }

  const closed = await db
    .update(cajaLoteSession)
    .set({ retiradoAt: new Date() })
    .where(and(...conditions))
    .returning();

  if (closed.length === 0) {
    return NextResponse.json(
      { error: "No hay caja abierta para cerrar" },
      { status: 404 }
    );
  }

  return NextResponse.json({ closed });
}
