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
import { eq, inArray, desc, isNull, and } from "drizzle-orm";
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
      const existingRows = await db
        .select({ codigoLote: lote.codigoLote })
        .from(loteServicio)
        .innerJoin(lote, eq(lote.id, loteServicio.loteId))
        .where(eq(loteServicio.servicioId, servicioId));

      const existingCodes = new Set(
        existingRows
          .map((row) => row.codigoLote)
          .filter((value): value is string => Boolean(value))
          .map(normalizeCode)
      );

      const seenCodes = new Set<string>();
      const skippedDuplicates: string[] = [];
      const loteValues: Array<{
        codigoLote: string;
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
          if (seenCodes.has(normalizedCode) || existingCodes.has(normalizedCode)) {
            skippedDuplicates.push(code);
            continue;
          }

          seenCodes.add(normalizedCode);

          const itemVariedadId =
            typeof item.variedadId === "string" && item.variedadId
              ? item.variedadId
              : null;

          loteValues.push({
            codigoLote: code,
            variedadId: itemVariedadId,
            subvariedadId: await resolveSubvariedadId(item),
            createdAt: new Date(),
          });
        }

      if (loteValues.length === 0) {
        return NextResponse.json({
          created: 0,
          lotes: [],
          skippedDuplicates,
        });
      }

      const createdLotes = await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(lote)
          .values(loteValues)
          .returning({
            id: lote.id,
            codigoLote: lote.codigoLote,
            fechaCreacion: lote.createdAt,
            variedadId: lote.variedadId,
            subvariedadId: lote.subvariedadId,
          });

        await tx.insert(loteServicio).values(
          inserted.map((l) => ({
            loteId: l.id,
            servicioId,
          }))
        );

        return inserted;
      });

      const createdIds = createdLotes.map((l) => l.id);
      const enrichedLotes = await db
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
        .where(inArray(lote.id, createdIds));

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

    // Build values arrays (codigoLote only meaningful for individual creation)
    const loteValues = Array.from({ length: count }, () => ({
      codigoLote: count === 1 ? (codigoLote?.trim() || null) : null,
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

    // Delete lotes (cascade handles lote_servicio, lote_session, lote_stats)
    await db.delete(lote).where(inArray(lote.id, targetIds));

    return NextResponse.json({ deleted: targetIds.length });
  } catch (error) {
    console.error("Error deleting lotes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
