import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dispositivoServicio, servicio } from "@/db/schema";
import { verifyAdmin } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ servicioId: string }>;
}

type SalidaInput = {
  dispositivoId: string;
  salidaOrden: number | null;
  salidaNombre: string | null;
};

// Reconfiguración de las salidas físicas de un servicio.
//
// Recibe el SET COMPLETO de salidas, no un parche por dispositivo: intercambiar
// dos salidas entre sí (el error que cruzó AGX-1 y AGX-2 en Planting Stock Pelú)
// tiene que ser una sola operación atómica. Con un PATCH por dispositivo el paso
// intermedio chocaría contra el índice parcial dispositivo_servicio_salida_uq.
export async function PUT(req: Request, context: RouteContext) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { servicioId } = await context.params;
    const body = await req.json();
    const salidasRaw = body?.salidas;

    if (!Array.isArray(salidasRaw)) {
      return NextResponse.json(
        { error: "salidas debe ser un arreglo" },
        { status: 400 }
      );
    }

    const srv = await db.query.servicio.findFirst({
      where: eq(servicio.id, servicioId),
    });
    if (!srv) {
      return NextResponse.json(
        { error: "Servicio no encontrado" },
        { status: 404 }
      );
    }

    const salidas: SalidaInput[] = [];
    for (const raw of salidasRaw) {
      const dispositivoId = raw?.dispositivoId;
      if (typeof dispositivoId !== "string" || !dispositivoId) {
        return NextResponse.json(
          { error: "Cada salida requiere dispositivoId" },
          { status: 400 }
        );
      }

      const ordenRaw = raw?.salidaOrden;
      const salidaOrden =
        ordenRaw === null || ordenRaw === undefined || ordenRaw === ""
          ? null
          : Number(ordenRaw);
      if (
        salidaOrden !== null &&
        (!Number.isInteger(salidaOrden) || salidaOrden < 1 || salidaOrden > 32767)
      ) {
        return NextResponse.json(
          { error: "salidaOrden debe ser un entero mayor o igual a 1" },
          { status: 400 }
        );
      }

      const nombreRaw = raw?.salidaNombre;
      const salidaNombre =
        typeof nombreRaw === "string" && nombreRaw.trim()
          ? nombreRaw.trim()
          : salidaOrden !== null
            ? `Salida ${salidaOrden}`
            : null;

      salidas.push({ dispositivoId, salidaOrden, salidaNombre });
    }

    const dispositivosVistos = new Set<string>();
    const ordenesVistos = new Set<number>();
    for (const s of salidas) {
      if (dispositivosVistos.has(s.dispositivoId)) {
        return NextResponse.json(
          { error: "El mismo dispositivo aparece más de una vez" },
          { status: 400 }
        );
      }
      dispositivosVistos.add(s.dispositivoId);

      if (s.salidaOrden !== null) {
        if (ordenesVistos.has(s.salidaOrden)) {
          return NextResponse.json(
            { error: `La salida ${s.salidaOrden} está asignada a más de un dispositivo` },
            { status: 409 }
          );
        }
        ordenesVistos.add(s.salidaOrden);
      }
    }

    const vigentes = await db
      .select({ dispositivoId: dispositivoServicio.dispositivoId })
      .from(dispositivoServicio)
      .where(
        and(
          eq(dispositivoServicio.servicioId, servicioId),
          isNull(dispositivoServicio.fechaTermino)
        )
      );
    const vigentesIds = new Set(vigentes.map((v) => v.dispositivoId));

    for (const s of salidas) {
      if (!vigentesIds.has(s.dispositivoId)) {
        return NextResponse.json(
          {
            error: `El dispositivo ${s.dispositivoId} no tiene una asignación vigente en este servicio`,
          },
          { status: 400 }
        );
      }
    }

    // Limpiar primero todas las salidas vigentes del servicio y recién después
    // aplicar las nuevas: así el índice parcial único nunca ve un estado
    // intermedio inválido, sea cual sea el orden del payload.
    const actualizados = await db.transaction(async (tx) => {
      await tx
        .update(dispositivoServicio)
        .set({ salidaOrden: null, salidaNombre: null })
        .where(
          and(
            eq(dispositivoServicio.servicioId, servicioId),
            isNull(dispositivoServicio.fechaTermino)
          )
        );

      for (const s of salidas) {
        if (s.salidaOrden === null) continue;
        await tx
          .update(dispositivoServicio)
          .set({ salidaOrden: s.salidaOrden, salidaNombre: s.salidaNombre })
          .where(
            and(
              eq(dispositivoServicio.servicioId, servicioId),
              eq(dispositivoServicio.dispositivoId, s.dispositivoId),
              isNull(dispositivoServicio.fechaTermino)
            )
          );
      }

      return tx.query.dispositivoServicio.findMany({
        where: and(
          eq(dispositivoServicio.servicioId, servicioId),
          isNull(dispositivoServicio.fechaTermino)
        ),
        with: { dispositivo: true },
      });
    });

    return NextResponse.json({ asignados: actualizados }, { status: 200 });
  } catch (error) {
    // 23505 = unique_violation contra dispositivo_servicio_salida_uq. No debería
    // llegar acá (ya se valida arriba), pero si dos admins guardan a la vez el
    // perdedor merece un mensaje claro y no un 500.
    const code = (error as { code?: string } | undefined)?.code;
    if (code === "23505") {
      return NextResponse.json(
        { error: "Esa salida ya está asignada a otro dispositivo del servicio" },
        { status: 409 }
      );
    }
    console.error("Error configurando salidas del servicio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
