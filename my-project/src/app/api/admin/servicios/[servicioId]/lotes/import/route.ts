import { NextResponse } from "next/server";
import { and, eq, ne, inArray, sql, notExists } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  lote,
  loteServicio,
  servicio,
  variedad,
  subvariedad,
  producto,
} from "@/db/schema";
import { verifyAdmin } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ servicioId: string }>;
}

// Importar lotes a este servicio desde otro servicio del MISMO proceso.
// Importar = REUTILIZAR: se enlaza la fila de lote existente (única por
// empresa) a este servicio vía lote_servicio. Nunca se copian filas de lote,
// así que los conteos siguen independientes por servicio y la unicidad por
// empresa se preserva trivialmente.
export async function GET(req: Request, context: RouteContext) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { servicioId } = await context.params;

    const target = await db.query.servicio.findFirst({
      where: eq(servicio.id, servicioId),
    });
    if (!target) {
      return NextResponse.json(
        { error: "Servicio no encontrado" },
        { status: 404 }
      );
    }

    const procesoId = target.procesoId;
    if (!procesoId) {
      return NextResponse.json({ sources: [], lotes: [] });
    }

    // Servicios origen candidatos (mismo proceso, distinto al destino) con su
    // cantidad de lotes.
    const sources = await db
      .select({
        id: servicio.id,
        nombre: servicio.nombre,
        tipo: servicio.tipo,
        loteCount: sql<number>`count(${loteServicio.loteId})::int`,
      })
      .from(servicio)
      .leftJoin(loteServicio, eq(loteServicio.servicioId, servicio.id))
      .where(and(eq(servicio.procesoId, procesoId), ne(servicio.id, servicioId)))
      .groupBy(servicio.id, servicio.nombre, servicio.tipo);

    // Lotes de esos servicios que aún NO están enlazados al destino.
    const ls2 = alias(loteServicio, "ls2");
    const lotes = await db
      .select({
        id: lote.id,
        codigoLote: lote.codigoLote,
        variedadNombre: variedad.nombre,
        variedadTipo: variedad.tipo,
        subvariedadNombre: subvariedad.nombre,
        productoNombre: producto.nombre,
        sourceServicioId: loteServicio.servicioId,
        sourceServicioNombre: servicio.nombre,
      })
      .from(loteServicio)
      .innerJoin(servicio, eq(servicio.id, loteServicio.servicioId))
      .innerJoin(lote, eq(lote.id, loteServicio.loteId))
      .leftJoin(variedad, eq(variedad.id, lote.variedadId))
      .leftJoin(subvariedad, eq(subvariedad.id, lote.subvariedadId))
      .leftJoin(producto, eq(producto.id, variedad.productoId))
      .where(
        and(
          eq(servicio.procesoId, procesoId),
          ne(loteServicio.servicioId, servicioId),
          notExists(
            db
              .select({ x: sql`1` })
              .from(ls2)
              .where(
                and(eq(ls2.loteId, lote.id), eq(ls2.servicioId, servicioId))
              )
          )
        )
      )
      .orderBy(lote.codigoLote);

    return NextResponse.json({ sources, lotes });
  } catch (error) {
    console.error("Error fetching importable lotes:", error);
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
    const body = await req.json().catch(() => ({}));
    const sourceServicioId =
      typeof body.sourceServicioId === "string" && body.sourceServicioId
        ? body.sourceServicioId
        : null;
    const loteIds: unknown = body.loteIds;

    const target = await db.query.servicio.findFirst({
      where: eq(servicio.id, servicioId),
    });
    if (!target) {
      return NextResponse.json(
        { error: "Servicio no encontrado" },
        { status: 404 }
      );
    }
    const procesoId = target.procesoId;
    if (!procesoId) {
      return NextResponse.json(
        { error: "El servicio no pertenece a un proceso" },
        { status: 409 }
      );
    }

    // Resolver el conjunto de lotes candidatos (deben pertenecer al proceso).
    let candidateIds: string[] = [];

    if (Array.isArray(loteIds) && loteIds.length > 0) {
      if (loteIds.length > 500) {
        return NextResponse.json(
          { error: "Maximum 500 lotes per request" },
          { status: 400 }
        );
      }
      const ids = loteIds.filter(
        (id): id is string => typeof id === "string" && !!id
      );
      const rows = await db
        .selectDistinct({ loteId: loteServicio.loteId })
        .from(loteServicio)
        .innerJoin(servicio, eq(servicio.id, loteServicio.servicioId))
        .where(
          and(
            eq(servicio.procesoId, procesoId),
            ne(loteServicio.servicioId, servicioId),
            inArray(loteServicio.loteId, ids)
          )
        );
      candidateIds = rows.map((r) => r.loteId);
    } else if (sourceServicioId) {
      const src = await db.query.servicio.findFirst({
        where: and(
          eq(servicio.id, sourceServicioId),
          eq(servicio.procesoId, procesoId)
        ),
      });
      if (!src) {
        return NextResponse.json(
          { error: "Servicio origen inválido" },
          { status: 400 }
        );
      }
      const rows = await db
        .select({ loteId: loteServicio.loteId })
        .from(loteServicio)
        .where(eq(loteServicio.servicioId, sourceServicioId));
      candidateIds = rows.map((r) => r.loteId);
    } else {
      return NextResponse.json(
        { error: "Se requiere sourceServicioId o loteIds" },
        { status: 400 }
      );
    }

    candidateIds = [...new Set(candidateIds)];
    if (candidateIds.length === 0) {
      return NextResponse.json({ imported: 0, skipped: 0 });
    }

    // Excluir los que ya están enlazados al destino.
    const already = await db
      .select({ loteId: loteServicio.loteId })
      .from(loteServicio)
      .where(
        and(
          eq(loteServicio.servicioId, servicioId),
          inArray(loteServicio.loteId, candidateIds)
        )
      );
    const alreadySet = new Set(already.map((r) => r.loteId));
    const toLink = candidateIds.filter((id) => !alreadySet.has(id));

    let imported = 0;
    if (toLink.length > 0) {
      const inserted = await db
        .insert(loteServicio)
        .values(toLink.map((loteId) => ({ loteId, servicioId })))
        .onConflictDoNothing()
        .returning({ loteId: loteServicio.loteId });
      imported = inserted.length;
    }

    return NextResponse.json({
      imported,
      skipped: candidateIds.length - imported,
    });
  } catch (error) {
    console.error("Error importing lotes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
