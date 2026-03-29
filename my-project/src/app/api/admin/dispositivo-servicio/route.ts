import { NextResponse } from "next/server";
import { db } from "@/db";
import { dispositivoServicio } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dispositivoId, servicioId, maquina } = await req.json();

    if (!dispositivoId || !servicioId) {
      return NextResponse.json(
        { error: "dispositivoId and servicioId are required" },
        { status: 400 }
      );
    }

    const [assignment] = await db
      .insert(dispositivoServicio)
      .values({ dispositivoId, servicioId, maquina: maquina || null })
      .returning();

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Error assigning dispositivo to servicio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dispositivoId, servicioId } = await req.json();

    if (!dispositivoId || !servicioId) {
      return NextResponse.json(
        { error: "dispositivoId and servicioId are required" },
        { status: 400 }
      );
    }

    const [removed] = await db
      .delete(dispositivoServicio)
      .where(
        and(
          eq(dispositivoServicio.dispositivoId, dispositivoId),
          eq(dispositivoServicio.servicioId, servicioId)
        )
      )
      .returning();

    if (!removed) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Dispositivo removed from servicio" });
  } catch (error) {
    console.error("Error removing dispositivo from servicio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
