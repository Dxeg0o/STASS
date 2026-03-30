import { NextResponse } from "next/server";
import { db } from "@/db";
import { dispositivo } from "@/db/schema";
import { verifyAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dispositivos = await db.query.dispositivo.findMany({
      with: {
        dispositivoServicios: {
          with: { servicio: true },
        },
      },
    });

    return NextResponse.json(dispositivos);
  } catch (error) {
    console.error("Error fetching dispositivos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { nombre, tipo } = await req.json();

    if (!nombre) {
      return NextResponse.json(
        { error: "nombre is required" },
        { status: 400 }
      );
    }

    const [newDispositivo] = await db
      .insert(dispositivo)
      .values({
        nombre,
        tipo: tipo || "nvidia_agx",
      })
      .returning();

    return NextResponse.json(newDispositivo, { status: 201 });
  } catch (error) {
    console.error("Error creating dispositivo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
