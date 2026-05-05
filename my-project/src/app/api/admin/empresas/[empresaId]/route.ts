import { NextResponse } from "next/server";
import { db } from "@/db";
import { dispositivoServicio, empresa } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
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

    const result = await db.query.empresa.findFirst({
      where: eq(empresa.id, empresaId),
      with: {
        empresaUsuarios: {
          with: { usuario: true },
        },
        procesos: {
          with: { tipoProceso: true, producto: true },
        },
        servicios: {
          with: {
            proceso: { with: { tipoProceso: true } },
            ubicacion: true,
            dispositivoServicios: {
              where: isNull(dispositivoServicio.fechaTermino),
            },
          },
        },
        ubicaciones: true,
      },
    });

    if (!result) {
      return NextResponse.json(
        { error: "Empresa not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching empresa:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { empresaId } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.pais !== undefined) updateData.pais = body.pais;

    const [updated] = await db
      .update(empresa)
      .set(updateData)
      .where(eq(empresa.id, empresaId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Empresa not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating empresa:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { empresaId } = await params;

    const [deleted] = await db
      .delete(empresa)
      .where(eq(empresa.id, empresaId))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Empresa not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Empresa deleted" });
  } catch (error) {
    console.error("Error deleting empresa:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
