import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { caja } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";
import { isUniqueViolation } from "@/lib/app-idempotent";
import { serializeCaja } from "@/lib/app-serialize";

interface Body {
  codigo?: unknown;
  empresa_id?: unknown;
  id?: unknown;
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

  if (typeof body.codigo !== "string" || typeof body.empresa_id !== "string") {
    return NextResponse.json(
      { error: "codigo y empresa_id son requeridos" },
      { status: 400 }
    );
  }

  try {
    const [created] = await db
      .insert(caja)
      .values({
        ...(typeof body.id === "string" ? { id: body.id } : {}),
        codigo: body.codigo,
        empresaId: body.empresa_id,
        tipo: "reutilizable",
        activa: true,
      })
      .returning();

    return NextResponse.json(serializeCaja(created), { status: 201 });
  } catch (e) {
    // Reintento offline (mismo id y código): idempotente.
    if (isUniqueViolation(e) && typeof body.id === "string") {
      const existing = await db.query.caja.findFirst({
        where: eq(caja.id, body.id),
      });
      if (existing) {
        return NextResponse.json(serializeCaja(existing), { status: 200 });
      }
    }
    throw e;
  }
}
