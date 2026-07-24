import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { loteCierreCalibreBin, dispositivoServicio, dispositivo } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";

// ─── Contrato ───────────────────────────────────────────────────────────────
//
// Este endpoint sostiene DOS shapes de payload a la vez, mientras existan tablets con
// el APK viejo (plan de calibre por salida, fase F2→F6):
//
//   v1 (legacy, servicio en modo 'medido' o tablet sin actualizar):
//     POST { servicio_id, items: [{ calibre_from, calibre_to, bins }] }
//     → declaración a nivel de LOTE, sin salida. Mismo comportamiento de siempre.
//
//   v2 (servicio en modo 'declarado', tablet actualizada — F3):
//     POST { servicio_id, v: 2, tramos: [{ dispositivo_id, calibre_from, calibre_to,
//            bins, vigente_desde, vigente_hasta }] }
//     → uno o más tramos POR SALIDA. calibre_from/calibre_to nullable (rango abierto,
//       ej. merma "<6"), pero no ambos. vigente_desde/hasta nullable (ventana abierta).
//
// Regla que evita perder datos del otro shape: el DELETE que precede al INSERT se
// acota SIEMPRE por dispositivo_id (NULL para v1, el dispositivo puntual para cada
// salida en v2) — nunca un DELETE de todo el lote+servicio. Ver
// docs/plan_calibre_declarado_por_salida.md §4.1 en qualiblick-app.

interface BodyV1 {
  servicio_id?: unknown;
  items?: unknown;
}

interface BodyV2 {
  servicio_id?: unknown;
  v?: unknown;
  tramos?: unknown;
}

type InsertItem = typeof loteCierreCalibreBin.$inferInsert;

function serializeLegacy(row: typeof loteCierreCalibreBin.$inferSelect) {
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

function serializeTramo(row: typeof loteCierreCalibreBin.$inferSelect) {
  return {
    id: row.id,
    lote_id: row.loteId,
    servicio_id: row.servicioId,
    dispositivo_id: row.dispositivoId,
    calibre_from: row.calibreFrom,
    calibre_to: row.calibreTo,
    bins: row.bins,
    vigente_desde: row.vigenteDesde ? row.vigenteDesde.toISOString() : null,
    vigente_hasta: row.vigenteHasta ? row.vigenteHasta.toISOString() : null,
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

// Evita que un dispositivo de OTRO servicio (o inexistente) reciba una declaración por
// salida acá — la FK de dispositivoId solo garantiza que el dispositivo existe en
// general, no que esté vinculado a este servicio. `cache` es por-request (no a nivel de
// módulo): en un runtime serverless con instancias tibias, un cache a nivel de módulo
// quedaría con respuestas obsoletas si un dispositivo se reasigna de servicio.
async function dispositivoPerteneceAServicio(
  dispositivoId: string,
  servicioId: string,
  cache: Map<string, boolean>
): Promise<boolean> {
  const cacheKey = `${dispositivoId}:${servicioId}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const found = await db.query.dispositivoServicio.findFirst({
    where: and(
      eq(dispositivoServicio.dispositivoId, dispositivoId),
      eq(dispositivoServicio.servicioId, servicioId)
    ),
    columns: { id: true },
  });
  const belongs = found !== undefined;
  cache.set(cacheKey, belongs);
  return belongs;
}

// GET: devuelve el shape legacy (`items`, para compatibilidad con el APK actual) más
// `tramos` (declaraciones por salida) y `salidas` (todas las salidas configuradas del
// servicio, incluso sin declarar aún — con calibre/bins null). El cliente nuevo (F3)
// usa `salidas` + `tramos` para prellenar el diálogo de cierre, una fila por salida
// aunque esté vacía.
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

  const legacyRows = rows.filter((r) => r.dispositivoId === null);
  const tramoRows = rows.filter((r) => r.dispositivoId !== null);

  const salidaRows = await db
    .select({
      dispositivoId: dispositivo.id,
      nombre: dispositivo.nombre,
      salidaOrden: dispositivoServicio.salidaOrden,
      salidaNombre: dispositivoServicio.salidaNombre,
    })
    .from(dispositivoServicio)
    .innerJoin(dispositivo, eq(dispositivo.id, dispositivoServicio.dispositivoId))
    .where(
      and(
        eq(dispositivoServicio.servicioId, servicioId),
        isNull(dispositivoServicio.fechaTermino)
      )
    )
    .orderBy(asc(dispositivoServicio.salidaOrden));

  return NextResponse.json(
    {
      items: legacyRows.map(serializeLegacy),
      tramos: tramoRows.map(serializeTramo),
      salidas: salidaRows.map((s) => ({
        dispositivo_id: s.dispositivoId,
        nombre: s.nombre,
        salida_orden: s.salidaOrden,
        salida_nombre: s.salidaNombre,
      })),
    },
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

  const body = raw as BodyV1 & BodyV2;
  if (typeof body.servicio_id !== "string" || !body.servicio_id) {
    return NextResponse.json(
      { error: "servicio_id es requerido" },
      { status: 400 }
    );
  }
  const servicioId = body.servicio_id;

  const isV2 = body.v === 2 || Array.isArray(body.tramos);

  if (isV2) {
    return handleV2(loteId, servicioId, body, tablet.id);
  }
  return handleV1(loteId, servicioId, body, tablet.id);
}

// ─── v1: declaración legacy a nivel de lote (sin salida) ──────────────────
async function handleV1(
  loteId: string,
  servicioId: string,
  body: BodyV1,
  tabletId: string
) {
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
      servicioId,
      dispositivoId: null,
      calibreFrom,
      calibreTo,
      bins,
      tabletId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const saved = await db.transaction(async (tx) => {
    // Acotado a dispositivoId IS NULL: nunca toca los tramos por salida (v2) del
    // mismo lote+servicio.
    await tx
      .delete(loteCierreCalibreBin)
      .where(
        and(
          eq(loteCierreCalibreBin.loteId, loteId),
          eq(loteCierreCalibreBin.servicioId, servicioId),
          isNull(loteCierreCalibreBin.dispositivoId)
        )
      );

    if (items.length === 0) return [];

    return tx.insert(loteCierreCalibreBin).values(items).returning();
  });

  return NextResponse.json(
    { items: saved.map(serializeLegacy) },
    { status: 200 }
  );
}

// ─── v2: tramos por salida, con vigencia temporal ─────────────────────────
async function handleV2(
  loteId: string,
  servicioId: string,
  body: BodyV2,
  tabletId: string
) {
  if (!Array.isArray(body.tramos)) {
    return NextResponse.json(
      { error: "tramos debe ser una lista" },
      { status: 400 }
    );
  }

  const byDispositivo = new Map<string, InsertItem[]>();
  const dispositivoServicioCache = new Map<string, boolean>();

  for (const raw of body.tramos) {
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "tramo inválido" }, { status: 400 });
    }
    const record = raw as Record<string, unknown>;

    const dispositivoId = record.dispositivo_id;
    if (typeof dispositivoId !== "string" || !dispositivoId) {
      return NextResponse.json(
        { error: "dispositivo_id es requerido en cada tramo" },
        { status: 400 }
      );
    }

    const calibreFromRaw = record.calibre_from;
    const calibreToRaw = record.calibre_to;
    const calibreFrom =
      calibreFromRaw === null || calibreFromRaw === undefined
        ? null
        : Number(calibreFromRaw);
    const calibreTo =
      calibreToRaw === null || calibreToRaw === undefined
        ? null
        : Number(calibreToRaw);
    const bins = Number(record.bins);

    const rangeValido =
      (calibreFrom !== null || calibreTo !== null) &&
      (calibreFrom === null || (Number.isInteger(calibreFrom) && calibreFrom >= 0)) &&
      (calibreTo === null || Number.isInteger(calibreTo)) &&
      (calibreFrom === null || calibreTo === null || calibreTo > calibreFrom);

    // Rango abierto (merma, ej. "<6" o ">10") = falta calibre_from o calibre_to.
    // En ese caso los bins son opcionales (0 permitido) — una merma frecuentemente no
    // lleva conteo de bins. Rango cerrado (calibre normal) sigue exigiendo bins > 0.
    // Coincide con el CHECK de la migración 0030.
    const isOpenRange = calibreFrom === null || calibreTo === null;

    if (
      !rangeValido ||
      !Number.isFinite(bins) ||
      Math.abs(bins * 10 - Math.round(bins * 10)) > 1e-9 ||
      bins < 0 ||
      (!isOpenRange && bins <= 0)
    ) {
      return NextResponse.json(
        {
          error:
            "calibre_from/calibre_to deben ser enteros válidos (al menos uno no nulo, from < to); bins no puede ser negativo, y debe ser mayor que cero salvo en rangos abiertos (merma); máximo un decimal",
        },
        { status: 400 }
      );
    }

    const vigenteDesdeRaw = record.vigente_desde;
    const vigenteHastaRaw = record.vigente_hasta;
    const vigenteDesde =
      typeof vigenteDesdeRaw === "string" ? new Date(vigenteDesdeRaw) : null;
    const vigenteHasta =
      typeof vigenteHastaRaw === "string" ? new Date(vigenteHastaRaw) : null;
    if (
      (vigenteDesdeRaw != null && Number.isNaN(vigenteDesde?.getTime())) ||
      (vigenteHastaRaw != null && Number.isNaN(vigenteHasta?.getTime()))
    ) {
      return NextResponse.json(
        { error: "vigente_desde/vigente_hasta deben ser fechas ISO válidas" },
        { status: 400 }
      );
    }
    if (
      vigenteDesde &&
      vigenteHasta &&
      vigenteHasta.getTime() <= vigenteDesde.getTime()
    ) {
      return NextResponse.json(
        { error: "vigente_hasta debe ser posterior a vigente_desde" },
        { status: 400 }
      );
    }

    if (
      !(await dispositivoPerteneceAServicio(
        dispositivoId,
        servicioId,
        dispositivoServicioCache
      ))
    ) {
      return NextResponse.json(
        {
          error: `dispositivo_id ${dispositivoId} no está asignado a este servicio`,
        },
        { status: 400 }
      );
    }

    const list = byDispositivo.get(dispositivoId) ?? [];
    list.push({
      loteId,
      servicioId,
      dispositivoId,
      calibreFrom,
      calibreTo,
      bins,
      vigenteDesde,
      vigenteHasta,
      tabletId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    byDispositivo.set(dispositivoId, list);
  }

  // Reemplazo completo por salida: se borra y reinserta el conjunto de tramos de CADA
  // dispositivo_id recibido, nunca de todo el lote+servicio. Así una salida que no
  // vino en este POST (porque no cambió) queda intacta, y las declaraciones legacy
  // (dispositivo_id IS NULL) ni se tocan.
  try {
    const saved = await db.transaction(async (tx) => {
      const out: (typeof loteCierreCalibreBin.$inferSelect)[] = [];
      for (const [dispositivoId, items] of byDispositivo) {
        await tx
          .delete(loteCierreCalibreBin)
          .where(
            and(
              eq(loteCierreCalibreBin.loteId, loteId),
              eq(loteCierreCalibreBin.servicioId, servicioId),
              eq(loteCierreCalibreBin.dispositivoId, dispositivoId)
            )
          );
        if (items.length > 0) {
          const inserted = await tx
            .insert(loteCierreCalibreBin)
            .values(items)
            .returning();
          out.push(...inserted);
        }
      }
      return out;
    });

    return NextResponse.json({ tramos: saved.map(serializeTramo) }, { status: 200 });
  } catch (err) {
    // 23P01 = exclusion_violation (tramos de la misma salida se solapan en el tiempo),
    // 23514 = check_violation (rango/vigencia inválidos que igual pasaron la
    // validación de arriba por alguna razón). Se traducen a 409 en vez de un 500
    // genérico, para que la tablet pueda mostrar un mensaje claro en F3.
    const code = (err as { code?: string } | undefined)?.code;
    if (code === "23P01" || code === "23514") {
      return NextResponse.json(
        {
          error:
            "Los tramos declarados para una misma salida no pueden solaparse en el tiempo",
        },
        { status: 409 }
      );
    }
    throw err;
  }
}
