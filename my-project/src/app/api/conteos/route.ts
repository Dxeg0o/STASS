// app/api/conteos/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { conteo, servicio, dispositivo } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteId = searchParams.get("loteId");
  const empresaId = searchParams.get("empresaId");
  const servicioId = searchParams.get("servicioId");
  const limit = parseInt(searchParams.get("limit") || "0", 10);
  const skip = parseInt(searchParams.get("skip") || "0", 10);

  if (!loteId && !empresaId && !servicioId) {
    return NextResponse.json(
      { error: "loteId, servicioId o empresaId son requeridos" },
      { status: 400 }
    );
  }

  // Build base query with dispositivo join for the nombre
  const baseSelect = {
    ts: conteo.ts,
    direction: conteo.direction,
    dispositivo: dispositivo.nombre,
    perimeter: conteo.perimeter,
    servicioId: conteo.servicioId,
    loteId: conteo.loteId,
  };

  let query;

  if (loteId) {
    query = db
      .select(baseSelect)
      .from(conteo)
      .innerJoin(dispositivo, eq(dispositivo.id, conteo.dispositivoId))
      .where(eq(conteo.loteId, loteId))
      .orderBy(desc(conteo.ts));
  } else if (servicioId) {
    query = db
      .select(baseSelect)
      .from(conteo)
      .innerJoin(dispositivo, eq(dispositivo.id, conteo.dispositivoId))
      .where(eq(conteo.servicioId, servicioId))
      .orderBy(desc(conteo.ts));
  } else {
    // empresaId → obtener servicioIds primero
    const servicios = await db
      .select({ id: servicio.id })
      .from(servicio)
      .where(eq(servicio.empresaId, empresaId!));

    const servicioIds = servicios.map((s) => s.id);
    if (servicioIds.length === 0) return NextResponse.json([]);

    query = db
      .select(baseSelect)
      .from(conteo)
      .innerJoin(dispositivo, eq(dispositivo.id, conteo.dispositivoId))
      .where(inArray(conteo.servicioId, servicioIds))
      .orderBy(desc(conteo.ts));
  }

  // Aplicar paginación – cast necesario por el tipo dinámico del query builder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let paged: any = query;
  if (skip > 0) paged = paged.offset(skip);
  if (limit > 0) paged = paged.limit(limit);
  const rows = await paged;

  // Normalizar direction: 0 → "in", 1 → "out"
  const result = rows.map((r: typeof rows[number]) => ({
    ...r,
    timestamp: r.ts,
    direction: r.direction === 0 ? "in" : "out",
  }));

  return NextResponse.json(result);
}
