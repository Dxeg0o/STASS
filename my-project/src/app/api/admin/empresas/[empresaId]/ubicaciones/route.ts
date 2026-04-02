import { NextResponse } from "next/server";
import { db } from "@/db";
import { ubicacion } from "@/db/schema";
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

    const ubicaciones = await db.query.ubicacion.findMany({
      where: eq(ubicacion.empresaId, empresaId),
    });

    return NextResponse.json(ubicaciones);
  } catch (error) {
    console.error("Error fetching ubicaciones:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    const { nombre, tipo, lat, lng } = await req.json();

    if (!nombre || !tipo) {
      return NextResponse.json(
        { error: "nombre and tipo are required" },
        { status: 400 }
      );
    }

    const [newUbicacion] = await db
      .insert(ubicacion)
      .values({
        nombre,
        empresaId,
        tipo,
        lat: lat ?? null,
        lng: lng ?? null,
      })
      .returning();

    return NextResponse.json(newUbicacion, { status: 201 });
  } catch (error) {
    console.error("Error creating ubicacion:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
