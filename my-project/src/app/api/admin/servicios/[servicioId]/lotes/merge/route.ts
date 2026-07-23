import { NextResponse } from "next/server";
import { and, eq, inArray, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { lote, loteServicio, servicio } from "@/db/schema";
import { verifyAdmin } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ servicioId: string }>;
}

const isPgErrorCode = (e: unknown, code: string) =>
  (e as { cause?: { code?: string }; code?: string } | undefined)?.cause?.code === code ||
  (e as { code?: string } | undefined)?.code === code;

// Unificar (merge) 2+ lotes de un servicio en un único lote destino, combinando
// sus conteos SOLO dentro de este servicio. Los lotes origen se desvinculan del
// servicio y se borran si no quedan en ningún otro servicio (protege el uso
// compartido de un lote entre procesos). El destino puede ser uno de los lotes
// seleccionados o un lote nuevo (código personalizado). Ver plan.
export async function POST(req: Request, context: RouteContext) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { servicioId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const rawIds: unknown = body.loteIds;
    const targetLoteId =
      typeof body.targetLoteId === "string" && body.targetLoteId
        ? body.targetLoteId
        : null;
    const custom =
      body.custom && typeof body.custom === "object" ? body.custom : null;

    if (!Array.isArray(rawIds)) {
      return NextResponse.json(
        { error: "Se requieren al menos 2 lotes" },
        { status: 400 }
      );
    }
    const ids = [
      ...new Set(rawIds.filter((x): x is string => typeof x === "string" && !!x)),
    ];
    if (ids.length < 2) {
      return NextResponse.json(
        { error: "Se requieren al menos 2 lotes" },
        { status: 400 }
      );
    }
    if (ids.length > 200) {
      return NextResponse.json({ error: "Máximo 200 lotes" }, { status: 400 });
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
    const empresaId = srv.empresaId;

    // Todos los lotes deben estar enlazados a este servicio
    const linked = await db
      .select({ loteId: loteServicio.loteId })
      .from(loteServicio)
      .where(
        and(
          eq(loteServicio.servicioId, servicioId),
          inArray(loteServicio.loteId, ids)
        )
      );
    const linkedSet = new Set(linked.map((r) => r.loteId));
    if (ids.some((id) => !linkedSet.has(id))) {
      return NextResponse.json(
        { error: "Todos los lotes deben pertenecer a este servicio" },
        { status: 400 }
      );
    }

    // Resolver lote destino T
    let targetId: string;
    let createdTarget = false;

    if (targetLoteId) {
      if (!ids.includes(targetLoteId)) {
        return NextResponse.json(
          { error: "El lote destino debe ser uno de los seleccionados" },
          { status: 400 }
        );
      }
      targetId = targetLoteId;
    } else if (
      custom &&
      typeof custom.codigoLote === "string" &&
      custom.codigoLote.trim()
    ) {
      const code = custom.codigoLote.trim();
      let existing: { id: string } | undefined;
      if (empresaId) {
        [existing] = await db
          .select({ id: lote.id })
          .from(lote)
          .where(and(eq(lote.empresaId, empresaId), ilike(lote.codigoLote, code)))
          .limit(1);
      }
      if (existing) {
        if (ids.includes(existing.id)) {
          targetId = existing.id; // equivale a elegir la identidad de ese lote
        } else {
          return NextResponse.json(
            { error: "El código ya existe en la empresa" },
            { status: 409 }
          );
        }
      } else {
        const variedadId =
          typeof custom.variedadId === "string" && custom.variedadId
            ? custom.variedadId
            : null;
        const subvariedadId =
          typeof custom.subvariedadId === "string" && custom.subvariedadId
            ? custom.subvariedadId
            : null;
        const [created] = await db
          .insert(lote)
          .values({
            codigoLote: code,
            empresaId,
            variedadId,
            subvariedadId,
            createdAt: new Date(),
          })
          .returning({ id: lote.id });
        targetId = created.id;
        createdTarget = true;
      }
    } else {
      return NextResponse.json(
        { error: "Falta el destino (targetLoteId o custom.codigoLote)" },
        { status: 400 }
      );
    }

    const sources = ids.filter((id) => id !== targetId);
    if (sources.length === 0) {
      return NextResponse.json(
        { error: "No hay lotes de origen para unificar" },
        { status: 400 }
      );
    }
    const allInvolved = [...sources, targetId];

    try {
      const deletedSources = await db.transaction(async (tx) => {
        // 1. Mover conteos (solo este servicio) al lote destino
        await tx.execute(sql`
          UPDATE conteo SET lote_id = ${targetId}
          WHERE servicio_id = ${servicioId} AND lote_id = ANY(${sources})
        `);

        // 2. Re-apuntar las sesiones del servicio al lote destino (así las
        //    caja_lote_session y caja_*_stats quedan bajo el destino)
        await tx.execute(sql`
          UPDATE lote_session ls SET lote_id = ${targetId}
          WHERE ls.lote_id = ANY(${sources})
            AND EXISTS (
              SELECT 1 FROM dispositivo_servicio ds
              WHERE ds.dispositivo_id = ls.dispositivo_id
                AND ds.servicio_id = ${servicioId}
                AND ls.start_time >= ds.fecha_inicio
                AND (ds.fecha_termino IS NULL OR ls.start_time < ds.fecha_termino)
            )
        `);

        // 3. Reconstruir stats de lote para (destino, servicio)
        await tx.execute(sql`
          DELETE FROM lote_total_stats
          WHERE servicio_id = ${servicioId} AND lote_id = ANY(${allInvolved})
        `);
        await tx.execute(sql`
          DELETE FROM lote_stats
          WHERE servicio_id = ${servicioId} AND lote_id = ANY(${allInvolved})
        `);
        await tx.execute(sql`
          INSERT INTO lote_total_stats (lote_id, servicio_id, dispositivo_id, count_in, count_out, first_ts, last_ts)
          SELECT lote_id, servicio_id, dispositivo_id,
            SUM(CASE WHEN direction = 0 THEN 1 ELSE 0 END)::int,
            SUM(CASE WHEN direction = 1 THEN 1 ELSE 0 END)::int,
            MIN(ts), MAX(ts)
          FROM conteo
          WHERE servicio_id = ${servicioId} AND lote_id = ${targetId}
          GROUP BY lote_id, servicio_id, dispositivo_id
        `);
        await tx.execute(sql`
          INSERT INTO lote_stats (lote_id, servicio_id, dispositivo_id, calibre, count_in, count_out, first_ts, last_ts)
          SELECT lote_id, servicio_id, dispositivo_id, ROUND(perimeter::numeric, 1)::real,
            SUM(CASE WHEN direction = 0 THEN 1 ELSE 0 END)::int,
            SUM(CASE WHEN direction = 1 THEN 1 ELSE 0 END)::int,
            MIN(ts), MAX(ts)
          FROM conteo
          WHERE servicio_id = ${servicioId} AND lote_id = ${targetId} AND perimeter IS NOT NULL
          GROUP BY lote_id, servicio_id, dispositivo_id, ROUND(perimeter::numeric, 1)::real
        `);

        // 4. Repuntar referencias de batches de recalibración (sin FK)
        await tx.execute(sql`
          UPDATE perimeter_recal_batches SET lote_id = ${targetId}
          WHERE lote_id = ANY(${sources})
        `);

        // 5. Desvincular los lotes origen de este servicio
        await tx.execute(sql`
          DELETE FROM lote_servicio
          WHERE servicio_id = ${servicioId} AND lote_id = ANY(${sources})
        `);

        // 6. Asegurar que el destino queda enlazado al servicio
        await tx
          .insert(loteServicio)
          .values({ loteId: targetId, servicioId })
          .onConflictDoNothing();

        // 7. Borrar los lotes origen totalmente consumidos (sin datos en ningún
        //    otro servicio)
        const deleted = await tx.execute(sql`
          DELETE FROM lote l
          WHERE l.id = ANY(${sources})
            AND NOT EXISTS (SELECT 1 FROM lote_servicio ls WHERE ls.lote_id = l.id)
            AND NOT EXISTS (SELECT 1 FROM conteo c WHERE c.lote_id = l.id)
            AND NOT EXISTS (SELECT 1 FROM lote_session s WHERE s.lote_id = l.id)
          RETURNING l.id
        `);
        return (deleted as unknown as unknown[]).length;
      });

      return NextResponse.json({
        targetLoteId: targetId,
        merged: sources.length,
        deletedSources,
        createdTarget,
      });
    } catch (e) {
      if (isPgErrorCode(e, "55000")) {
        return NextResponse.json(
          {
            error:
              "No se puede unificar: hay conteos protegidos por un proceso de recalibración.",
          },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (error) {
    console.error("Error merging lotes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
