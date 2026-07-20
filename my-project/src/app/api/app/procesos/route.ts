import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { proceso, tipoProceso } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";

// Procesos "en_curso" de una empresa, con el nombre resuelto desde
// tipo_proceso (mismo join que hoy hace el cliente Supabase).
export async function GET(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId es requerido" },
      { status: 400 }
    );
  }

  const rows = await db
    .select({
      id: proceso.id,
      empresaId: proceso.empresaId,
      estado: proceso.estado,
      temporada: proceso.temporada,
      createdAt: proceso.createdAt,
      tipoProcesoNombre: tipoProceso.nombre,
    })
    .from(proceso)
    .innerJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
    .where(and(eq(proceso.empresaId, empresaId), eq(proceso.estado, "en_curso")))
    .orderBy(desc(proceso.createdAt));

  const procesos = rows.map((r) => ({
    id: r.id,
    empresa_id: r.empresaId,
    estado: r.estado,
    temporada: r.temporada,
    tipo_proceso: { nombre: r.tipoProcesoNombre },
  }));

  return NextResponse.json({ procesos }, { status: 200 });
}
