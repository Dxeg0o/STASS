import { NextResponse } from "next/server";
import { db } from "@/db";
import { subvariedad, variedad } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productoId: string; variedadId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productoId, variedadId } = await params;
    const [parentVariedad] = await db
      .select({ id: variedad.id })
      .from(variedad)
      .where(
        and(eq(variedad.id, variedadId), eq(variedad.productoId, productoId))
      )
      .limit(1);

    if (!parentVariedad) {
      return NextResponse.json(
        { error: "Variedad not found" },
        { status: 404 }
      );
    }

    const subvariedades = await db.query.subvariedad.findMany({
      where: eq(subvariedad.variedadId, variedadId),
    });

    return NextResponse.json(subvariedades);
  } catch (error) {
    console.error("Error fetching subvariedades:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ productoId: string; variedadId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productoId, variedadId } = await params;
    const { nombre } = await req.json();

    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: "nombre is required" },
        { status: 400 }
      );
    }

    const [parentVariedad] = await db
      .select({ id: variedad.id })
      .from(variedad)
      .where(
        and(eq(variedad.id, variedadId), eq(variedad.productoId, productoId))
      )
      .limit(1);

    if (!parentVariedad) {
      return NextResponse.json(
        { error: "Variedad not found" },
        { status: 404 }
      );
    }

    const [newSubvariedad] = await db
      .insert(subvariedad)
      .values({
        nombre: nombre.trim(),
        variedadId,
      })
      .returning();

    return NextResponse.json(newSubvariedad, { status: 201 });
  } catch (error) {
    console.error("Error creating subvariedad:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
