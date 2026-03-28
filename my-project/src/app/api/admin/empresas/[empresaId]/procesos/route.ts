import { NextResponse } from "next/server";
import { db } from "@/db";
import { proceso } from "@/db/schema";
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

    const procesos = await db.query.proceso.findMany({
      where: eq(proceso.empresaId, empresaId),
      with: {
        tipoProceso: true,
        producto: true,
      },
    });

    return NextResponse.json(procesos);
  } catch (error) {
    console.error("Error fetching procesos:", error);
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
    const { tipoProcesoId, productoId, temporada, estado, fechaInicio, notas } =
      await req.json();

    if (!tipoProcesoId) {
      return NextResponse.json(
        { error: "tipoProcesoId is required" },
        { status: 400 }
      );
    }

    const [newProceso] = await db
      .insert(proceso)
      .values({
        tipoProcesoId,
        empresaId,
        productoId: productoId || null,
        temporada: temporada || null,
        estado: estado || "planificado",
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        notas: notas || null,
      })
      .returning();

    return NextResponse.json(newProceso, { status: 201 });
  } catch (error) {
    console.error("Error creating proceso:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
