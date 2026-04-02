import { NextResponse } from "next/server";
import { db } from "@/db";
import { ubicacion } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ empresaId: string; ubicacionId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ubicacionId } = await params;

    const [deleted] = await db
      .delete(ubicacion)
      .where(eq(ubicacion.id, ubicacionId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Ubicacion no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ message: "Ubicacion eliminada" });
  } catch (error) {
    console.error("Error deleting ubicacion:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
