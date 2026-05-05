import { NextResponse } from "next/server";
import { db } from "@/db";
import { proceso, servicio } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function GET(
  req: Request,
  {
    params,
  }: { params: Promise<{ empresaId: string; procesoId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { procesoId } = await params;

    const servicios = await db.query.servicio.findMany({
      where: eq(servicio.procesoId, procesoId),
    });

    return NextResponse.json(servicios);
  } catch (error) {
    console.error("Error fetching servicios:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  {
    params,
  }: { params: Promise<{ empresaId: string; procesoId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { empresaId, procesoId } = await params;
    const { nombre, tipo, ubicacionId, usaCajas, fechaInicio } =
      await req.json();

    if (!nombre || !tipo) {
      return NextResponse.json(
        { error: "nombre and tipo are required" },
        { status: 400 }
      );
    }

    const parentProceso = await db.query.proceso.findFirst({
      where: eq(proceso.id, procesoId),
    });

    if (!parentProceso) {
      return NextResponse.json(
        { error: "Proceso no encontrado" },
        { status: 404 }
      );
    }

    if (parentProceso.estado === "completado" || parentProceso.estado === "cancelado") {
      return NextResponse.json(
        { error: "No se pueden agregar servicios a un proceso cerrado" },
        { status: 409 }
      );
    }

    const startsActive = parentProceso.estado === "en_curso";
    const serviceStart = startsActive
      ? fechaInicio
        ? new Date(fechaInicio)
        : new Date()
      : null;

    const [newServicio] = await db
      .insert(servicio)
      .values({
        nombre,
        empresaId,
        procesoId,
        tipo,
        ubicacionId: ubicacionId || null,
        usaCajas: usaCajas ?? false,
        estado: startsActive ? "en_curso" : "planificado",
        fechaInicio: serviceStart,
      })
      .returning();

    return NextResponse.json(newServicio, { status: 201 });
  } catch (error) {
    console.error("Error creating servicio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
