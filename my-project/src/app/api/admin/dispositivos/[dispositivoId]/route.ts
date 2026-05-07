import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  dispositivo,
  lote,
  loteSession,
  producto,
  subvariedad,
  variedad,
} from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ dispositivoId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dispositivoId } = await params;

    const device = await db.query.dispositivo.findFirst({
      where: eq(dispositivo.id, dispositivoId),
      with: {
        dispositivoServicios: {
          orderBy: (assignment, { desc }) => [desc(assignment.asignadoAt)],
          with: {
            servicio: {
              with: {
                empresa: true,
                proceso: { with: { tipoProceso: true } },
                ubicacion: true,
              },
            },
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Dispositivo not found" },
        { status: 404 }
      );
    }

    const [loteActivo] = await db
      .select({
        id: loteSession.id,
        sessionId: loteSession.id,
        dispositivoId: loteSession.dispositivoId,
        loteId: loteSession.loteId,
        startTime: loteSession.startTime,
        codigoLote: lote.codigoLote,
      })
      .from(loteSession)
      .innerJoin(lote, eq(lote.id, loteSession.loteId))
      .where(
        and(
          eq(loteSession.dispositivoId, dispositivoId),
          isNull(loteSession.endTime)
        )
      )
      .orderBy(desc(loteSession.startTime))
      .limit(1);

    const historialLotes = await db
      .select({
        id: loteSession.id,
        sessionId: loteSession.id,
        dispositivoId: loteSession.dispositivoId,
        loteId: loteSession.loteId,
        startTime: loteSession.startTime,
        endTime: loteSession.endTime,
        codigoLote: lote.codigoLote,
        variedadNombre: variedad.nombre,
        subvariedadNombre: subvariedad.nombre,
        productoNombre: producto.nombre,
      })
      .from(loteSession)
      .innerJoin(lote, eq(lote.id, loteSession.loteId))
      .leftJoin(variedad, eq(variedad.id, lote.variedadId))
      .leftJoin(subvariedad, eq(subvariedad.id, lote.subvariedadId))
      .leftJoin(producto, eq(producto.id, variedad.productoId))
      .where(eq(loteSession.dispositivoId, dispositivoId))
      .orderBy(desc(loteSession.startTime));

    const historialServicios = [...device.dispositivoServicios].sort((a, b) => {
      if (!a.fechaTermino && b.fechaTermino) return -1;
      if (a.fechaTermino && !b.fechaTermino) return 1;

      const aDate = a.asignadoAt?.getTime() ?? 0;
      const bDate = b.asignadoAt?.getTime() ?? 0;
      return bDate - aDate;
    });

    return NextResponse.json({
      ...device,
      servicioActual:
        historialServicios.find((assignment) => !assignment.fechaTermino) ??
        null,
      loteActivo: loteActivo ?? null,
      historialServicios,
      historialLotes,
    });
  } catch (error) {
    console.error("Error fetching dispositivo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ dispositivoId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dispositivoId } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.activo !== undefined) updateData.activo = body.activo;

    const [updated] = await db
      .update(dispositivo)
      .set(updateData)
      .where(eq(dispositivo.id, dispositivoId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Dispositivo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating dispositivo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ dispositivoId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dispositivoId } = await params;

    const [deleted] = await db
      .delete(dispositivo)
      .where(eq(dispositivo.id, dispositivoId))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Dispositivo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Dispositivo deleted" });
  } catch (error) {
    console.error("Error deleting dispositivo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
