import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { loteCierreCalibreBin } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";

interface Body {
  servicio_id?: unknown;
  items?: unknown;
}

type InsertItem = typeof loteCierreCalibreBin.$inferInsert;

function serialize(row: typeof loteCierreCalibreBin.$inferSelect) {
  return {
    lote_id: row.loteId,
    servicio_id: row.servicioId,
    calibre_from: row.calibreFrom,
    calibre_to: row.calibreTo,
    bins: row.bins,
    tablet_id: row.tabletId,
    created_at: row.createdAt ? row.createdAt.toISOString() : null,
    updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

function overlaps(
  leftFrom: number,
  leftTo: number,
  rightFrom: number,
  rightTo: number
) {
  return leftFrom < rightTo && rightFrom < leftTo;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: loteId } = await params;
  const { searchParams } = new URL(request.url);
  const servicioId = searchParams.get("servicioId");
  if (!servicioId) {
    return NextResponse.json(
      { error: "servicioId es requerido" },
      { status: 400 }
    );
  }

  const rows = await db
    .select()
    .from(loteCierreCalibreBin)
    .where(
      and(
        eq(loteCierreCalibreBin.loteId, loteId),
        eq(loteCierreCalibreBin.servicioId, servicioId)
      )
    )
    .orderBy(
      asc(loteCierreCalibreBin.calibreFrom),
      asc(loteCierreCalibreBin.calibreTo)
    );

  return NextResponse.json(
    { items: rows.map(serialize) },
    { status: 200 }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: loteId } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const body = raw as Body;
  if (typeof body.servicio_id !== "string" || !body.servicio_id) {
    return NextResponse.json(
      { error: "servicio_id es requerido" },
      { status: 400 }
    );
  }
  if (!Array.isArray(body.items)) {
    return NextResponse.json(
      { error: "items debe ser una lista" },
      { status: 400 }
    );
  }

  const ranges: Array<{ from: number; to: number }> = [];
  const items: InsertItem[] = [];
  for (const item of body.items) {
    if (!item || typeof item !== "object") {
      return NextResponse.json({ error: "item inválido" }, { status: 400 });
    }

    const record = item as Record<string, unknown>;
    const calibreFrom = Number(record.calibre_from);
    const calibreTo = Number(record.calibre_to);
    const bins = Number(record.bins);
    if (
      !Number.isInteger(calibreFrom) ||
      calibreFrom < 0 ||
      !Number.isInteger(calibreTo) ||
      calibreTo <= calibreFrom ||
      !Number.isFinite(bins) ||
      Math.abs(bins * 10 - Math.round(bins * 10)) > 1e-9 ||
      bins <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "calibre_from y calibre_to deben ser enteros válidos; bins debe ser mayor que cero y tener como máximo un decimal",
        },
        { status: 400 }
      );
    }

    if (
      ranges.some((range) =>
        overlaps(calibreFrom, calibreTo, range.from, range.to)
      )
    ) {
      return NextResponse.json(
        { error: "Los rangos de calibre no pueden superponerse" },
        { status: 400 }
      );
    }

    ranges.push({ from: calibreFrom, to: calibreTo });
    items.push({
      loteId,
      servicioId: body.servicio_id,
      calibreFrom,
      calibreTo,
      bins,
      tabletId: tablet.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const saved = await db.transaction(async (tx) => {
    await tx
      .delete(loteCierreCalibreBin)
      .where(
        and(
          eq(loteCierreCalibreBin.loteId, loteId),
          eq(loteCierreCalibreBin.servicioId, body.servicio_id as string)
        )
      );

    if (items.length === 0) return [];

    return tx.insert(loteCierreCalibreBin).values(items).returning();
  });

  return NextResponse.json(
    { items: saved.map(serialize) },
    { status: 200 }
  );
}
