import { NextResponse } from "next/server";
import { db } from "@/db";
import { dispositivo, lote, loteSession } from "@/db/schema";
import { verifyAdmin } from "@/lib/auth";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dispositivos = await db.query.dispositivo.findMany({
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

    const dispositivoIds = dispositivos.map((device) => device.id);
    const activeSessions =
      dispositivoIds.length > 0
        ? await db
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
                inArray(loteSession.dispositivoId, dispositivoIds),
                isNull(loteSession.endTime)
              )
            )
            .orderBy(desc(loteSession.startTime))
        : [];

    const activeSessionMap = new Map<string, (typeof activeSessions)[number]>();
    for (const session of activeSessions) {
      if (!activeSessionMap.has(session.dispositivoId)) {
        activeSessionMap.set(session.dispositivoId, session);
      }
    }

    const response = dispositivos.map((device) => {
      const historialServicios = [...device.dispositivoServicios].sort(
        (a, b) => {
          if (!a.fechaTermino && b.fechaTermino) return -1;
          if (a.fechaTermino && !b.fechaTermino) return 1;

          const aDate = a.asignadoAt?.getTime() ?? 0;
          const bDate = b.asignadoAt?.getTime() ?? 0;
          return bDate - aDate;
        }
      );

      return {
        ...device,
        servicioActual:
          historialServicios.find((assignment) => !assignment.fechaTermino) ??
          null,
        loteActivo: activeSessionMap.get(device.id) ?? null,
        historialServicios,
      };
    });

    return NextResponse.json(response);
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
