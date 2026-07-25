import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
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
    if (isUniqueViolation(e)) {
      // Dos casos de choque, ambos idempotentes:
      // 1. Mismo id: reintento exacto de la misma request (se cortó la red
      //    justo después de guardar, antes de que llegara la respuesta).
      // 2. Mismo código, id distinto: la caja es "reutilizable" y la tablet
      //    generó un id local nuevo sin saber que ya existía (típico al
      //    trabajar offline). En ambos casos se devuelve la fila que ya
      //    existe — el cliente es responsable de corregir cualquier
      //    operación ya encolada que referencie el id local si no coincide
      //    con el id real devuelto acá (ver SyncEngine._executeOp /
      //    remapCajaId en offline_repository.dart).
      const existing =
        (typeof body.id === "string"
          ? await db.query.caja.findFirst({ where: eq(caja.id, body.id) })
          : undefined) ??
        (await db.query.caja.findFirst({
          where: and(
            eq(caja.codigo, body.codigo as string),
            eq(caja.empresaId, body.empresa_id as string)
          ),
        }));
      if (existing) {
        return NextResponse.json(serializeCaja(existing), { status: 200 });
      }
    }
    throw e;
  }
}
