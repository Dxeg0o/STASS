import { db } from "@/db";
import { variedad } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productoId = searchParams.get("productoId");

    if (!productoId) {
      return NextResponse.json(
        { error: "productoId query parameter is required" },
        { status: 400 }
      );
    }

    const variedades = await db
      .select({ id: variedad.id, nombre: variedad.nombre, tipo: variedad.tipo })
      .from(variedad)
      .where(eq(variedad.productoId, productoId));

    return NextResponse.json(variedades);
  } catch (error) {
    console.error("Error fetching variedades:", error);
    return NextResponse.json(
      { error: "Failed to fetch variedades" },
      { status: 500 }
    );
  }
}
