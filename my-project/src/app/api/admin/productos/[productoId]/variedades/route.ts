import { NextResponse } from "next/server";
import { db } from "@/db";
import { variedad } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productoId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productoId } = await params;

    const variedades = await db.query.variedad.findMany({
      where: eq(variedad.productoId, productoId),
    });

    return NextResponse.json(variedades);
  } catch (error) {
    console.error("Error fetching variedades:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ productoId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productoId } = await params;
    const { nombre, tipo } = await req.json();

    if (!nombre) {
      return NextResponse.json(
        { error: "nombre is required" },
        { status: 400 }
      );
    }

    const [newVariedad] = await db
      .insert(variedad)
      .values({
        nombre,
        tipo: tipo || null,
        productoId,
      })
      .returning();

    return NextResponse.json(newVariedad, { status: 201 });
  } catch (error) {
    console.error("Error creating variedad:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
