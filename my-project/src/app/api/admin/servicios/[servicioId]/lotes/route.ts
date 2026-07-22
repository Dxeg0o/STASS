import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  lote,
  loteServicio,
  loteSession,
  variedad,
  subvariedad,
  producto,
  servicio,
} from "@/db/schema";
import { eq, inArray, desc, isNull, isNotNull, and, ilike } from "drizzle-orm";
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

    // Get lote IDs via junction table
    const junctionRows = await db
      .select({ loteId: loteServicio.loteId })
      .from(loteServicio)
      .where(eq(loteServicio.servicioId, servicioId));

    const loteIds = junctionRows.map((r) => r.loteId);
    if (loteIds.length === 0) return NextResponse.json([]);

    const lotes = await db
      .select({
        id: lote.id,
        codigoLote: lote.codigoLote,
        fechaCreacion: lote.createdAt,
        variedadId: lote.variedadId,
        variedadNombre: variedad.nombre,
        variedadTipo: variedad.tipo,
        subvariedadId: lote.subvariedadId,
        subvariedadNombre: subvariedad.nombre,
        productoNombre: producto.nombre,
      })
      .from(lote)
      .leftJoin(variedad, eq(variedad.id, lote.variedadId))
      .leftJoin(subvariedad, eq(subvariedad.id, lote.subvariedadId))
      .leftJoin(producto, eq(producto.id, variedad.productoId))
      .where(inArray(lote.id, loteIds))
      .orderBy(desc(lote.createdAt));

    return NextResponse.json(lotes);
  } catch (error) {
    console.error("Error fetching lotes:", error);
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
    const body = await req.json();
    const { variedadId, subvariedadId, cantidad, codigoLote, lotes: lotesInput } = body;

    // Validate service exists
    const srv = await db.query.servicio.findFirst({
      where: eq(servicio.id, servicioId),
    });
    if (!srv) {
      return NextResponse.json(
        { error: "Servicio no encontrado" },
        { status: 404 }
      );
    }

    if (Array.isArray(lotesInput)) {
      if (lotesInput.length === 0) {
        return NextResponse.json(
          { error: "lotes array is required" },
          { status: 400 }
        );
      }

      if (lotesInput.length > 500) {
        return NextResponse.json(
          { error: "Maximum 500 lotes per request" },
          { status: 400 }
        );
      }

      const normalizeCode = (value: string) => value.trim().toLowerCase();
      const normalizeName = (value: string) =>
        value
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

      const getOrCreateSubvariedad = async (
        nombre: string,
        variedadId: string
      ) => {
        const cleanName = nombre.trim();
        if (!cleanName) return null;

        const existing = await db
          .select({ id: subvariedad.id, nombre: subvariedad.nombre })
          .from(subvariedad)
          .where(eq(subvariedad.variedadId, variedadId));

        const match = existing.find(
          (item) => normalizeName(item.nombre) === normalizeName(cleanName)
        );
        if (match) return match.id;

        const [created] = await db
          .insert(subvariedad)
          .values({ nombre: cleanName, variedadId })
          .onConflictDoNothing()
          .returning({ id: subvariedad.id });

        if (created) return created.id;

        const fallback = await db
          .select({ id: subvariedad.id, nombre: subvariedad.nombre })
          .from(subvariedad)
          .where(eq(subvariedad.variedadId, variedadId));

        return (
          fallback.find(
            (item) => normalizeName(item.nombre) === normalizeName(cleanName)
          )?.id ?? null
        );
      };

      const resolveSubvariedadId = async (item: {
        variedadId?: unknown;
        subvariedadId?: unknown;
        subvariedadNombre?: unknown;
      }) => {
        const itemVariedadId =
          typeof item.variedadId === "string" && item.variedadId
            ? item.variedadId
            : null;

        if (!itemVariedadId) return null;

        if (typeof item.subvariedadId === "string" && item.subvariedadId) {
          const [existing] = await db
            .select({ id: subvariedad.id })
            .from(subvariedad)
            .where(
              and(
                eq(subvariedad.id, item.subvariedadId),
                eq(subvariedad.variedadId, itemVariedadId)
              )
            )
            .limit(1);

          if (existing) return existing.id;
        }

        if (
          typeof item.subvariedadNombre === "string" &&
          item.subvariedadNombre.trim()
        ) {
          return getOrCreateSubvariedad(item.subvariedadNombre, itemVariedadId);
        }

        return null;
      };
      const empresaId = srv.empresaId;

      // Códigos ya vinculados a ESTE servicio (para "ya está aquí")
      const linkedRows = await db
        .select({ codigoLote: lote.codigoLote })
        .from(loteServicio)
        .innerJoin(lote, eq(lote.id, loteServicio.loteId))
        .where(eq(loteServicio.servicioId, servicioId));
      const linkedCodes = new Set(
        linkedRows
          .map((row) => row.codigoLote)
          .filter((value): value is string => Boolean(value))
          .map(normalizeCode)
      );

      // Lotes existentes en la EMPRESA por código normalizado (unicidad por empresa)
      const empresaByCode = new Map<string, string>();
      if (empresaId) {
        const empresaRows = await db
          .select({ id: lote.id, codigoLote: lote.codigoLote })
          .from(lote)
          .where(and(eq(lote.empresaId, empresaId), isNotNull(lote.codigoLote)));
        for (const row of empresaRows) {
          if (row.codigoLote)
            empresaByCode.set(normalizeCode(row.codigoLote), row.id);
        }
      }

      const seenCodes = new Set<string>();
      const skippedDuplicates: string[] = [];
      const reuseLoteIds: string[] = [];
      const loteValues: Array<{
        codigoLote: string;
        empresaId: string | null;
        variedadId: string | null;
        subvariedadId: string | null;
        createdAt: Date;
      }> = [];

      for (const item of lotesInput as Array<{
        codigoLote?: unknown;
        variedadId?: unknown;
        subvariedadId?: unknown;
        subvariedadNombre?: unknown;
      }>) {
          const code =
            typeof item.codigoLote === "string" ? item.codigoLote.trim() : "";
          if (!code) continue;

          const normalizedCode = normalizeCode(code);
          if (seenCodes.has(normalizedCode)) {
            skippedDuplicates.push(code);
            continue;
          }
          seenCodes.add(normalizedCode);

          // Ya está en este servicio → nada que hacer
          if (linkedCodes.has(normalizedCode)) {
            skippedDuplicates.push(code);
            continue;
          }

          // Ya existe en la empresa (otro servicio/proceso) → reutilizar la fila
          const existingId = empresaByCode.get(normalizedCode);
          if (existingId) {
            reuseLoteIds.push(existingId);
            continue;
          }

          const itemVariedadId =
            typeof item.variedadId === "string" && item.variedadId
              ? item.variedadId
              : null;

          loteValues.push({
            codigoLote: code,
            empresaId,
            variedadId: itemVariedadId,
            subvariedadId: await resolveSubvariedadId(item),
            createdAt: new Date(),
          });
        }

      if (loteValues.length === 0 && reuseLoteIds.length === 0) {
        return NextResponse.json({
          created: 0,
          lotes: [],
          skippedDuplicates,
        });
      }

      const linkedIds = await db.transaction(async (tx) => {
        let insertedIds: string[] = [];
        if (loteValues.length > 0) {
          // onConflictDoNothing cubre una posible carrera con el índice único por empresa
          const inserted = await tx
            .insert(lote)
            .values(loteValues)
            .onConflictDoNothing()
            .returning({ id: lote.id });
          insertedIds = inserted.map((l) => l.id);
        }

        // Resolver ids finales de códigos nuevos (incluye los que perdió el onConflict)
        let resolvedNewIds = insertedIds;
        if (empresaId && insertedIds.length < loteValues.length) {
          const newCodesNorm = loteValues.map((v) => normalizeCode(v.codigoLote));
          const rows = await tx
            .select({ id: lote.id, codigoLote: lote.codigoLote })
            .from(lote)
            .where(and(eq(lote.empresaId, empresaId), isNotNull(lote.codigoLote)));
          const map = new Map<string, string>();
          for (const r of rows) if (r.codigoLote) map.set(normalizeCode(r.codigoLote), r.id);
          resolvedNewIds = newCodesNorm
            .map((c) => map.get(c))
            .filter((v): v is string => Boolean(v));
        }

        const allLinkIds = [...new Set([...reuseLoteIds, ...resolvedNewIds])];
        if (allLinkIds.length > 0) {
          await tx
            .insert(loteServicio)
            .values(allLinkIds.map((loteId) => ({ loteId, servicioId })))
            .onConflictDoNothing();
        }
        return allLinkIds;
      });

      const enrichedLotes = linkedIds.length
        ? await db
            .select({
              id: lote.id,
              codigoLote: lote.codigoLote,
              fechaCreacion: lote.createdAt,
              variedadId: lote.variedadId,
              variedadNombre: variedad.nombre,
              variedadTipo: variedad.tipo,
              subvariedadId: lote.subvariedadId,
              subvariedadNombre: subvariedad.nombre,
              productoNombre: producto.nombre,
            })
            .from(lote)
            .leftJoin(variedad, eq(variedad.id, lote.variedadId))
            .leftJoin(subvariedad, eq(subvariedad.id, lote.subvariedadId))
            .leftJoin(producto, eq(producto.id, variedad.productoId))
            .where(inArray(lote.id, linkedIds))
        : [];

      return NextResponse.json(
        {
          created: enrichedLotes.length,
          lotes: enrichedLotes,
          skippedDuplicates,
        },
        { status: 201 }
      );
    }

    const count = Math.min(Math.max(cantidad ?? 1, 1), 500);
    const empresaId = srv.empresaId;
    const trimmedCode = count === 1 ? (codigoLote?.trim() || null) : null;

    // Reutilizar la fila si el código ya existe en la empresa (unicidad por empresa)
    if (count === 1 && trimmedCode && empresaId) {
      const [existing] = await db
        .select({ id: lote.id })
        .from(lote)
        .where(and(eq(lote.empresaId, empresaId), ilike(lote.codigoLote, trimmedCode)))
        .limit(1);
      if (existing) {
        await db
          .insert(loteServicio)
          .values({ loteId: existing.id, servicioId })
          .onConflictDoNothing();
        const [enriched] = await db
          .select({
            id: lote.id,
            codigoLote: lote.codigoLote,
            fechaCreacion: lote.createdAt,
            variedadId: lote.variedadId,
            variedadNombre: variedad.nombre,
            variedadTipo: variedad.tipo,
            subvariedadId: lote.subvariedadId,
            subvariedadNombre: subvariedad.nombre,
            productoNombre: producto.nombre,
          })
          .from(lote)
          .leftJoin(variedad, eq(variedad.id, lote.variedadId))
          .leftJoin(subvariedad, eq(subvariedad.id, lote.subvariedadId))
          .leftJoin(producto, eq(producto.id, variedad.productoId))
          .where(eq(lote.id, existing.id));
        return NextResponse.json(
          { created: 1, lotes: [enriched], reused: true },
          { status: 201 }
        );
      }
    }

    // Build values arrays (codigoLote only meaningful for individual creation)
    const loteValues = Array.from({ length: count }, () => ({
      codigoLote: trimmedCode,
      empresaId,
      variedadId: variedadId || null,
      subvariedadId: subvariedadId || null,
      createdAt: new Date(),
    }));

    // Transaction: insert lotes, then junction records
    const createdLotes = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(lote)
        .values(loteValues)
        .returning({ id: lote.id, codigoLote: lote.codigoLote, fechaCreacion: lote.createdAt });

      await tx.insert(loteServicio).values(
        inserted.map((l) => ({
          loteId: l.id,
          servicioId,
        }))
      );

      return inserted;
    });

    // If variedad was provided, fetch names for the response
    let variedadNombre: string | null = null;
    let productoNombre: string | null = null;
    let subvariedadNombre: string | null = null;

    if (variedadId) {
      const v = await db.query.variedad.findFirst({
        where: eq(variedad.id, variedadId),
        with: { producto: true },
      });
      if (v) {
        variedadNombre = v.nombre;
        productoNombre = v.producto?.nombre ?? null;
      }
    }
    
    if (subvariedadId) {
      const sv = await db.query.subvariedad.findFirst({
        where: eq(subvariedad.id, subvariedadId),
      });
      if (sv) {
        subvariedadNombre = sv.nombre;
      }
    }

    const lotesWithNames = createdLotes.map((l) => ({
      ...l,
      variedadId: variedadId || null,
      subvariedadId: subvariedadId || null,
      variedadNombre,
      productoNombre,
      subvariedadNombre,
    }));

    return NextResponse.json(
      { created: createdLotes.length, lotes: lotesWithNames },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating lotes:", error);
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

    await context.params; // consume params
    const { servicioId } = await context.params;
    const { loteIds, deleteAll } = await req.json();

    let targetIds: string[] = [];

    if (deleteAll) {
      const junctionRows = await db
        .select({ loteId: loteServicio.loteId })
        .from(loteServicio)
        .where(eq(loteServicio.servicioId, servicioId));
      
      targetIds = junctionRows.map((r) => r.loteId);

      if (targetIds.length === 0) {
        return NextResponse.json({ deleted: 0 });
      }
    } else {
      if (!Array.isArray(loteIds) || loteIds.length === 0) {
        return NextResponse.json(
          { error: "loteIds array is required" },
          { status: 400 }
        );
      }

      if (loteIds.length > 500) {
        return NextResponse.json(
          { error: "Maximum 500 lotes per request" },
          { status: 400 }
        );
      }
      
      targetIds = loteIds;
    }

    // Check for active sessions
    const activeSessions = await db
      .select({ loteId: loteSession.loteId })
      .from(loteSession)
      .where(
        and(
          inArray(loteSession.loteId, targetIds),
          isNull(loteSession.endTime)
        )
      );

    if (activeSessions.length > 0) {
      const blockedIds = [...new Set(activeSessions.map((s) => s.loteId))];
      return NextResponse.json(
        {
          error: "Algunos lotes tienen sesiones activas y no pueden ser eliminados",
          blockedLoteIds: blockedIds,
        },
        { status: 409 }
      );
    }

    // Un lote puede estar compartido entre servicios/procesos de la empresa.
    // "Borrar desde este servicio" = desvincular (quitar la fila de lote_servicio).
    // Solo hard-delete cuando el lote no queda vinculado a ningún otro servicio.
    const deleted = await db.transaction(async (tx) => {
      await tx
        .delete(loteServicio)
        .where(
          and(
            eq(loteServicio.servicioId, servicioId),
            inArray(loteServicio.loteId, targetIds)
          )
        );

      const remaining = await tx
        .select({ loteId: loteServicio.loteId })
        .from(loteServicio)
        .where(inArray(loteServicio.loteId, targetIds));
      const stillLinked = new Set(remaining.map((r) => r.loteId));
      const orphanIds = targetIds.filter((id) => !stillLinked.has(id));

      if (orphanIds.length > 0) {
        // cascade elimina lote_session/lote_stats/etc. de los lotes ya sin servicio
        await tx.delete(lote).where(inArray(lote.id, orphanIds));
      }

      return targetIds.length;
    });

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("Error deleting lotes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await context.params; // consume params
    const { loteId, codigoLote, variedadId, subvariedadId } = await req.json();

    if (!loteId) {
      return NextResponse.json(
        { error: "loteId is required" },
        { status: 400 }
      );
    }

    const updatedLote = await db
      .update(lote)
      .set({
        codigoLote: codigoLote || null,
        variedadId: variedadId || null,
        subvariedadId: subvariedadId || null,
      })
      .where(eq(lote.id, loteId))
      .returning();

    if (updatedLote.length === 0) {
      return NextResponse.json(
        { error: "Lote no encontrado" },
        { status: 404 }
      );
    }

    const [enriched] = await db
      .select({
        id: lote.id,
        codigoLote: lote.codigoLote,
        fechaCreacion: lote.createdAt,
        variedadId: lote.variedadId,
        variedadNombre: variedad.nombre,
        variedadTipo: variedad.tipo,
        subvariedadId: lote.subvariedadId,
        subvariedadNombre: subvariedad.nombre,
        productoNombre: producto.nombre,
      })
      .from(lote)
      .leftJoin(variedad, eq(variedad.id, lote.variedadId))
      .leftJoin(subvariedad, eq(subvariedad.id, lote.subvariedadId))
      .leftJoin(producto, eq(producto.id, variedad.productoId))
      .where(eq(lote.id, loteId));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error updating lote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
