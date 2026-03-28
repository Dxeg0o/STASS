import { NextResponse } from "next/server";
import { db } from "@/db";
import { workflowEmpresa, workflowPaso } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId es requerido" },
      { status: 400 }
    );
  }

  const workflows = await db.query.workflowEmpresa.findMany({
    where: eq(workflowEmpresa.empresaId, empresaId),
    with: {
      pasos: {
        with: { tipoProceso: true },
        orderBy: (paso, { asc }) => [asc(paso.orden)],
      },
    },
  });

  return NextResponse.json(workflows);
}

export async function POST(request: Request) {
  const { empresaId, nombre, pasos } = await request.json();
  if (!empresaId || !nombre) {
    return NextResponse.json(
      { error: "empresaId y nombre son requeridos" },
      { status: 400 }
    );
  }

  // pasos: [{ tipoProcesoId, orden }]
  const [workflow] = await db
    .insert(workflowEmpresa)
    .values({ empresaId, nombre })
    .returning();

  if (pasos && Array.isArray(pasos) && pasos.length > 0) {
    await db.insert(workflowPaso).values(
      pasos.map((p: { tipoProcesoId: string; orden: number }) => ({
        workflowEmpresaId: workflow.id,
        tipoProcesoId: p.tipoProcesoId,
        orden: p.orden,
      }))
    );
  }

  // Return with pasos
  const result = await db.query.workflowEmpresa.findFirst({
    where: eq(workflowEmpresa.id, workflow.id),
    with: {
      pasos: {
        with: { tipoProceso: true },
        orderBy: (paso, { asc }) => [asc(paso.orden)],
      },
    },
  });

  return NextResponse.json(result, { status: 201 });
}
