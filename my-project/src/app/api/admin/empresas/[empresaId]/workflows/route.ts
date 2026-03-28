import { NextResponse } from "next/server";
import { db } from "@/db";
import { workflowEmpresa, workflowPaso } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { empresaId } = await params;

    const workflows = await db.query.workflowEmpresa.findMany({
      where: eq(workflowEmpresa.empresaId, empresaId),
      with: {
        pasos: {
          with: { tipoProceso: true },
          orderBy: (pasos, { asc }) => [asc(pasos.orden)],
        },
      },
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { empresaId } = await params;
    const { nombre, pasos } = await req.json();

    if (!nombre) {
      return NextResponse.json(
        { error: "nombre is required" },
        { status: 400 }
      );
    }

    const [newWorkflow] = await db
      .insert(workflowEmpresa)
      .values({ nombre, empresaId })
      .returning();

    if (pasos && Array.isArray(pasos) && pasos.length > 0) {
      await db.insert(workflowPaso).values(
        pasos.map((paso: { tipoProcesoId: string; orden: number }) => ({
          workflowEmpresaId: newWorkflow.id,
          tipoProcesoId: paso.tipoProcesoId,
          orden: paso.orden,
        }))
      );
    }

    const result = await db.query.workflowEmpresa.findFirst({
      where: eq(workflowEmpresa.id, newWorkflow.id),
      with: {
        pasos: {
          with: { tipoProceso: true },
          orderBy: (pasos, { asc }) => [asc(pasos.orden)],
        },
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
