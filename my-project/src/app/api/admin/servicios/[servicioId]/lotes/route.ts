import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  lote,
  loteServicio,
  loteSession,
  variedad,
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
        productoNombre: producto.nombre,
      })
      .from(lote)
      .leftJoin(variedad, eq(variedad.id, lote.variedadId))
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
    const { variedadId, cantidad, codigoLote } = await req.json();

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

    const count = Math.min(Math.max(cantidad ?? 1, 1), 500);

    // Build values arrays (codigoLote only meaningful for individual creation)
    const loteValues = Array.from({ length: count }, () => ({
      codigoLote: count === 1 ? (codigoLote?.trim() || null) : null,
      variedadId: variedadId || null,
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

    const lotesWithNames = createdLotes.map((l) => ({
      ...l,
      variedadId: variedadId || null,
      variedadNombre,
      productoNombre,
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
    const { loteIds } = await req.json();

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

    // Check for active sessions
    const activeSessions = await db
      .select({ loteId: loteSession.loteId })
      .from(loteSession)
      .where(
        and(
          inArray(loteSession.loteId, loteIds),
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
    await db.delete(lote).where(inArray(lote.id, loteIds));

    return NextResponse.json({ deleted: loteIds.length });
  } catch (error) {
    console.error("Error deleting lotes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
