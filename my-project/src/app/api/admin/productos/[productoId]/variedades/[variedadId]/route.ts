import { NextResponse } from "next/server";
import { db } from "@/db";
import { variedad } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productoId: string; variedadId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productoId, variedadId } = await params;

    const [deleted] = await db
      .delete(variedad)
      .where(
        and(eq(variedad.id, variedadId), eq(variedad.productoId, productoId))
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Variedad not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Variedad deleted" });
  } catch (error) {
    console.error("Error deleting variedad:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
