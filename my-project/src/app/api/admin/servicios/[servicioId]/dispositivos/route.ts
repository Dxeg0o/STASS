import { NextResponse } from "next/server";
import { db } from "@/db";
import { dispositivo, dispositivoServicio, servicio } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ servicioId: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { servicioId } = await context.params;

    const srv = await db.query.servicio.findFirst({
      where: eq(servicio.id, servicioId),
    });

    if (!srv) {
      return NextResponse.json(
        { error: "Servicio no encontrado" },
        { status: 404 }
      );
    }

    const [asignados, todos] = await Promise.all([
      db.query.dispositivoServicio.findMany({
        where: and(
          eq(dispositivoServicio.servicioId, servicioId),
          isNull(dispositivoServicio.fechaTermino)
        ),
        with: { dispositivo: true },
      }),
      db.query.dispositivo.findMany(),
    ]);

    const assignedIds = new Set(asignados.map((d) => d.dispositivoId));
    const disponibles = todos.filter((d) => !assignedIds.has(d.id));

    return NextResponse.json({ asignados, disponibles });
  } catch (error) {
    console.error("Error fetching dispositivos del servicio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { servicioId } = await context.params;
    const { dispositivoId, maquina } = await req.json();

    if (!dispositivoId) {
      return NextResponse.json(
        { error: "dispositivoId is required" },
        { status: 400 }
      );
    }

    const [srv, device] = await Promise.all([
      db.query.servicio.findFirst({ where: eq(servicio.id, servicioId) }),
      db.query.dispositivo.findFirst({
        where: eq(dispositivo.id, dispositivoId),
      }),
    ]);

    if (!srv) {
      return NextResponse.json(
        { error: "Servicio no encontrado" },
        { status: 404 }
      );
    }

    if (srv.estado === "completado" || srv.estado === "cancelado") {
      return NextResponse.json(
        { error: "No se pueden asignar dispositivos a un servicio cerrado" },
        { status: 409 }
      );
    }

    if (!device) {
      return NextResponse.json(
        { error: "Dispositivo no encontrado" },
        { status: 404 }
      );
    }

    const now = new Date();

    const [assignment] = await db.transaction(async (tx) => {
      await tx
        .update(dispositivoServicio)
        .set({ fechaTermino: now })
        .where(
          and(
            eq(dispositivoServicio.dispositivoId, dispositivoId),
            isNull(dispositivoServicio.fechaTermino)
          )
        );

      return tx
        .insert(dispositivoServicio)
        .values({
          dispositivoId,
          servicioId,
          maquina: maquina?.trim() || null,
          asignadoAt: now,
          fechaInicio: srv.estado === "en_curso" ? now : null,
          fechaTermino: null,
        })
        .returning();
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Error assigning dispositivo to servicio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { servicioId } = await context.params;
    const { dispositivoId } = await req.json();

    if (!dispositivoId) {
      return NextResponse.json(
        { error: "dispositivoId is required" },
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

    return NextResponse.json({ message: "Dispositivo removido del servicio" });
  } catch (error) {
    console.error("Error removing dispositivo from servicio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
