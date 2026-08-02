import { NextResponse } from "next/server";
import { db } from "@/db";
import { dispositivoServicio } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";
import { assignDeviceToServicio } from "@/lib/service-device-assignment";

export async function POST(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dispositivoId, servicioId, maquina, loteId, salidaOrden, salidaNombre } =
      await req.json();

    if (!dispositivoId || !servicioId) {
      return NextResponse.json(
        { error: "dispositivoId and servicioId are required" },
        { status: 400 }
      );
    }

    const result = await assignDeviceToServicio({
      dispositivoId,
      servicioId,
      maquina,
      loteId,
      ...(salidaOrden !== undefined ? { salidaOrden } : {}),
      ...(salidaNombre !== undefined ? { salidaNombre } : {}),
    });
    if (result.kind === "selection_required") {
      return NextResponse.json(
        { code: "ACTIVE_LOTE_SELECTION_REQUIRED", requiresLoteSelection: true, activeLotes: result.activeLotes },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ...result.assignment, joinedActiveLote: result.joinedActiveLote, loteSession: result.loteSession, requiresLoteSelection: false },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "SERVICE_NOT_FOUND") {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "SERVICE_CLOSED") {
      return NextResponse.json(
        { error: "No se pueden asignar dispositivos a un servicio cerrado" },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.message === "INVALID_ACTIVE_LOTE") {
      return NextResponse.json(
        { error: "El lote seleccionado no está activo en este servicio" },
        { status: 400 }
      );
    }
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
      .update(dispositivoServicio)
      .set({ fechaTermino: new Date() })
      .where(
        and(
          eq(dispositivoServicio.dispositivoId, dispositivoId),
          eq(dispositivoServicio.servicioId, servicioId),
          isNull(dispositivoServicio.fechaTermino)
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
