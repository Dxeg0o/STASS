import { NextResponse } from "next/server";
import { db } from "@/db";
import { producto } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ productoId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productoId } = await params;
    const { nombre } = await req.json();

    if (!nombre) {
      return NextResponse.json(
        { error: "nombre is required" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(producto)
      .set({ nombre })
      .where(eq(producto.id, productoId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Producto not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating producto:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productoId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productoId } = await params;

    const [deleted] = await db
      .delete(producto)
      .where(eq(producto.id, productoId))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Producto not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Producto deleted" });
  } catch (error) {
    console.error("Error deleting producto:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
