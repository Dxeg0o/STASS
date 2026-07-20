import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { servicio } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";

export async function GET(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const procesoId = searchParams.get("procesoId");
  const empresaId = searchParams.get("empresaId");
  if (!procesoId || !empresaId) {
    return NextResponse.json(
      { error: "procesoId y empresaId son requeridos" },
      { status: 400 }
    );
  }

  const rows = await db
    .select({
      id: servicio.id,
      nombre: servicio.nombre,
      empresaId: servicio.empresaId,
      procesoId: servicio.procesoId,
      tipo: servicio.tipo,
      usaCajas: servicio.usaCajas,
    })
    .from(servicio)
    .where(and(eq(servicio.procesoId, procesoId), eq(servicio.empresaId, empresaId)))
    .orderBy(asc(servicio.nombre));

  const servicios = rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    empresa_id: r.empresaId,
    proceso_id: r.procesoId,
    tipo: r.tipo,
    usa_cajas: r.usaCajas,
  }));

  return NextResponse.json({ servicios }, { status: 200 });
}
