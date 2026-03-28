import { NextResponse } from "next/server";
import { db } from "@/db";
import { dispositivo } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ dispositivoId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dispositivoId } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.activo !== undefined) updateData.activo = body.activo;

    const [updated] = await db
      .update(dispositivo)
      .set(updateData)
      .where(eq(dispositivo.id, dispositivoId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Dispositivo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating dispositivo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ dispositivoId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dispositivoId } = await params;

    const [deleted] = await db
      .delete(dispositivo)
      .where(eq(dispositivo.id, dispositivoId))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Dispositivo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Dispositivo deleted" });
  } catch (error) {
    console.error("Error deleting dispositivo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
