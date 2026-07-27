import { NextResponse } from "next/server";
import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  dispositivo,
  dispositivoServicio,
  loteCalibreDeclaradoDia,
  loteCierreCalibreBin,
  loteServicio,
  loteStats,
  servicio,
} from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";

type Acc = {
  calibreFrom: number;
  calibreTo: number;
  manualBins: number;
  loteStatsCount: number;
  loteIds: Set<string>;
};

type ManualRange = {
  loteId: string;
  calibreFrom: number;
  calibreTo: number;
  bins: number;
};

function key(calibreFrom: number, calibreTo: number) {
  return `${calibreFrom}:${calibreTo}`;
}

function label(calibreFrom: number, calibreTo: number) {
  return `Calibre ${calibreFrom}-${calibreTo} cm`;
}

function source(manualBins: number, loteStatsCount: number) {
  if (manualBins > 0 && loteStatsCount > 0) return "manual_qb";
  if (manualBins > 0) return "manual";
  return "qb";
}

// Igual que label(), pero soporta el rango abierto de una merma ("<6"/">10")
// declarada por salida — la versión legacy de arriba nunca lo necesita porque
// el POST v1 exige from/to no-nulos.
function declaradoLabel(from: number | null, to: number | null): string {
  if (from === null && to !== null) return `Calibre <${to} cm`;
  if (to === null && from !== null) return `Calibre >${from} cm`;
  if (from !== null && to !== null) return label(from, to);
  return "Sin declarar";
}

function rangeKey(from: number | null, to: number | null): string {
  return `${from ?? "null"}:${to ?? "null"}`;
}

// Cantidad por salida dentro de cada rango de calibre, para servicios en modo
// `declarado`. A diferencia del resumen legacy de arriba (que solo lee
// lote_cierre_calibre_bin con dispositivo_id NULL), acá la fuente es
// lote_calibre_declarado_dia — la tabla que ya resuelve, por dispositivo y por
// día, cuántas unidades cayeron en el rango que la operaria declaró al cerrar
// (o en el bucket "sin declarar" si no llegó a declarar esa salida). Se suma
// across días porque un lote puede abarcar más de uno.
//
// El tamaño (calibre_from/calibre_to) que se muestra por salida es
// exactamente el que escribió la operaria: lote_calibre_declarado_dia ya lo
// trae resuelto, no hace falta volver a leer lote_cierre_calibre_bin acá.
async function buildDeclaradoGroups(servicioId: string, loteIds: string[]) {
  if (loteIds.length === 0) return [];

  const rows = await db
    .select({
      dispositivoId: loteCalibreDeclaradoDia.dispositivoId,
      calibreFrom: loteCalibreDeclaradoDia.calibreFrom,
      calibreTo: loteCalibreDeclaradoDia.calibreTo,
      sinDeclarar: loteCalibreDeclaradoDia.sinDeclarar,
      loteId: loteCalibreDeclaradoDia.loteId,
      unidades: sql<number>`COALESCE(SUM(${loteCalibreDeclaradoDia.unidades}), 0)::int`,
    })
    .from(loteCalibreDeclaradoDia)
    .where(
      and(
        eq(loteCalibreDeclaradoDia.servicioId, servicioId),
        inArray(loteCalibreDeclaradoDia.loteId, loteIds)
      )
    )
    .groupBy(
      loteCalibreDeclaradoDia.dispositivoId,
      loteCalibreDeclaradoDia.calibreFrom,
      loteCalibreDeclaradoDia.calibreTo,
      loteCalibreDeclaradoDia.sinDeclarar,
      loteCalibreDeclaradoDia.loteId
    );

  if (rows.length === 0) return [];

  // Bins que la operaria escribió manualmente al cerrar, agregados por rango
  // (solo tramos por salida: dispositivo_id no nulo).
  const binRows = await db
    .select({
      calibreFrom: loteCierreCalibreBin.calibreFrom,
      calibreTo: loteCierreCalibreBin.calibreTo,
      bins: loteCierreCalibreBin.bins,
    })
    .from(loteCierreCalibreBin)
    .where(
      and(
        eq(loteCierreCalibreBin.servicioId, servicioId),
        inArray(loteCierreCalibreBin.loteId, loteIds),
        isNotNull(loteCierreCalibreBin.dispositivoId)
      )
    );

  const binsByRange = new Map<string, number>();
  for (const row of binRows) {
    const k = rangeKey(row.calibreFrom, row.calibreTo);
    binsByRange.set(k, (binsByRange.get(k) ?? 0) + (Number(row.bins) || 0));
  }

  // Nombre de salida vigente hoy — mismo criterio que usa la tablet
  // (displayLabel), no un snapshot histórico del día en que se contó.
  const dispositivoIds = [...new Set(rows.map((r) => r.dispositivoId))];
  const dispRows = dispositivoIds.length
    ? await db
        .select({
          id: dispositivo.id,
          nombre: dispositivo.nombre,
          salidaOrden: dispositivoServicio.salidaOrden,
          salidaNombre: dispositivoServicio.salidaNombre,
        })
        .from(dispositivo)
        .leftJoin(
          dispositivoServicio,
          and(
            eq(dispositivoServicio.dispositivoId, dispositivo.id),
            eq(dispositivoServicio.servicioId, servicioId)
          )
        )
        .where(inArray(dispositivo.id, dispositivoIds))
    : [];
  const dispositivoById = new Map(dispRows.map((d) => [d.id, d]));

  type SalidaAcc = { unidades: number };
  type RangeAcc = {
    calibreFrom: number | null;
    calibreTo: number | null;
    loteIds: Set<string>;
    salidas: Map<string, SalidaAcc>;
  };
  const ranges = new Map<string, RangeAcc>();

  for (const row of rows) {
    const k = row.sinDeclarar
      ? "sin_declarar"
      : rangeKey(row.calibreFrom, row.calibreTo);
    const range =
      ranges.get(k) ??
      ({
        calibreFrom: row.sinDeclarar ? null : row.calibreFrom,
        calibreTo: row.sinDeclarar ? null : row.calibreTo,
        loteIds: new Set<string>(),
        salidas: new Map<string, SalidaAcc>(),
      } satisfies RangeAcc);
    range.loteIds.add(row.loteId);

    const current = range.salidas.get(row.dispositivoId) ?? { unidades: 0 };
    current.unidades += Number(row.unidades) || 0;
    range.salidas.set(row.dispositivoId, current);

    ranges.set(k, range);
  }

  return [...ranges.entries()]
    .sort(
      ([, a], [, b]) =>
        (a.calibreFrom ?? -Infinity) - (b.calibreFrom ?? -Infinity)
    )
    .map(([k, range]) => {
      const totalUnidades = [...range.salidas.values()].reduce(
        (sum, s) => sum + s.unidades,
        0
      );

      return {
        calibre_from: range.calibreFrom,
        calibre_to: range.calibreTo,
        label:
          k === "sin_declarar"
            ? "Sin declarar"
            : declaradoLabel(range.calibreFrom, range.calibreTo),
        manual_bins: k === "sin_declarar" ? 0 : binsByRange.get(k) ?? 0,
        lote_stats_count: totalUnidades,
        source: "declarado",
        lote_count: range.loteIds.size,
        salidas: [...range.salidas.entries()]
          .map(([dispositivoId, s]) => {
            const disp = dispositivoById.get(dispositivoId);
            return {
              dispositivo_id: dispositivoId,
              salida_orden: disp?.salidaOrden ?? null,
              label: disp?.salidaNombre ?? disp?.nombre ?? "Salida",
              calibre_from: range.calibreFrom,
              calibre_to: range.calibreTo,
              unidades: s.unidades,
              unidades_in: 0,
              unidades_out: 0,
            };
          })
          .sort(
            (a, b) => (a.salida_orden ?? 999) - (b.salida_orden ?? 999)
          ),
      };
    });
}

export async function GET(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const servicioId = searchParams.get("servicioId");
  const loteId = searchParams.get("loteId");
  if (!servicioId) {
    return NextResponse.json(
      { error: "servicioId es requerido" },
      { status: 400 }
    );
  }

  const links = await db
    .select({ loteId: loteServicio.loteId })
    .from(loteServicio)
    .where(eq(loteServicio.servicioId, servicioId));

  const linkedLoteIds = [...new Set(links.map((row) => row.loteId))];
  const loteIds = loteId
    ? linkedLoteIds.filter((linkedId) => linkedId === loteId)
    : linkedLoteIds;

  const svc = await db.query.servicio.findFirst({
    where: eq(servicio.id, servicioId),
    columns: { modoCalibre: true },
  });
  if (svc?.modoCalibre === "declarado") {
    const groups = await buildDeclaradoGroups(servicioId, loteIds);
    return NextResponse.json({ groups }, { status: 200 });
  }

  if (loteIds.length === 0) {
    return NextResponse.json({ groups: [] }, { status: 200 });
  }

  // A partir de acá el servicio está en modo `medido` (el ramal `declarado` ya
  // devolvió arriba, vía buildDeclaradoGroups). Es la "Calibres por lote" de
  // revisión interna (calibre medido QB): se acota explícitamente a las
  // declaraciones LEGACY a nivel de lote (dispositivo_id IS NULL).
  const manualRowsRaw = await db
    .select({
      loteId: loteCierreCalibreBin.loteId,
      calibreFrom: loteCierreCalibreBin.calibreFrom,
      calibreTo: loteCierreCalibreBin.calibreTo,
      bins: loteCierreCalibreBin.bins,
    })
    .from(loteCierreCalibreBin)
    .where(
      and(
        eq(loteCierreCalibreBin.servicioId, servicioId),
        inArray(loteCierreCalibreBin.loteId, loteIds),
        isNull(loteCierreCalibreBin.dispositivoId)
      )
    )
    .orderBy(
      asc(loteCierreCalibreBin.calibreFrom),
      asc(loteCierreCalibreBin.calibreTo)
    );

  // Las declaraciones legacy siempre traen from/to no-nulos (el POST v1 los exige);
  // el filtro de abajo solo achica el tipo para TS, no descarta filas en la práctica.
  const manualRows = manualRowsRaw.filter(
    (row): row is typeof row & { calibreFrom: number; calibreTo: number } =>
      row.calibreFrom !== null && row.calibreTo !== null
  );

  const manualRangesByLote = new Map<string, ManualRange[]>();
  for (const row of manualRows) {
    const ranges = manualRangesByLote.get(row.loteId) ?? [];
    ranges.push({
      loteId: row.loteId,
      calibreFrom: row.calibreFrom,
      calibreTo: row.calibreTo,
      bins: row.bins,
    });
    manualRangesByLote.set(row.loteId, ranges);
  }

  const acc = new Map<string, Acc>();
  const getAcc = (calibreFrom: number, calibreTo: number) => {
    const rangeKey = key(calibreFrom, calibreTo);
    const current =
      acc.get(rangeKey) ??
      ({
        calibreFrom,
        calibreTo,
        manualBins: 0,
        loteStatsCount: 0,
        loteIds: new Set<string>(),
      } satisfies Acc);
    acc.set(rangeKey, current);
    return current;
  };

  for (const row of manualRows) {
    const entry = getAcc(row.calibreFrom, row.calibreTo);
    entry.manualBins += Number(row.bins) || 0;
    entry.loteIds.add(row.loteId);
  }

  const statRows = await db
    .select({
      loteId: loteStats.loteId,
      calibre: loteStats.calibre,
      count: sql<number>`COALESCE(SUM(${loteStats.countIn} + ${loteStats.countOut}), 0)::int`,
    })
    .from(loteStats)
    .where(
      and(
        eq(loteStats.servicioId, servicioId),
        inArray(loteStats.loteId, loteIds)
      )
    )
    .groupBy(loteStats.loteId, loteStats.calibre);

  for (const row of statRows) {
    const calibre = Number(row.calibre);
    if (!Number.isFinite(calibre)) continue;

    const manualRanges = manualRangesByLote.get(row.loteId);
    if (manualRanges?.length) {
      const matchingRange = manualRanges.find(
        (range) => calibre >= range.calibreFrom && calibre < range.calibreTo
      );
      if (!matchingRange) continue;

      const entry = getAcc(
        matchingRange.calibreFrom,
        matchingRange.calibreTo
      );
      entry.loteStatsCount += Number(row.count) || 0;
      entry.loteIds.add(row.loteId);
      continue;
    }

    const calibreFrom = Math.floor(calibre);
    const entry = getAcc(calibreFrom, calibreFrom + 1);
    entry.loteStatsCount += Number(row.count) || 0;
    entry.loteIds.add(row.loteId);
  }

  const groups = [...acc.values()]
    .sort(
      (left, right) =>
        left.calibreFrom - right.calibreFrom ||
        left.calibreTo - right.calibreTo
    )
    .map((entry) => ({
      calibre_from: entry.calibreFrom,
      calibre_to: entry.calibreTo,
      label: label(entry.calibreFrom, entry.calibreTo),
      manual_bins: entry.manualBins,
      lote_stats_count: entry.loteStatsCount,
      source: source(entry.manualBins, entry.loteStatsCount),
      lote_count: entry.loteIds.size,
    }));

  return NextResponse.json({ groups }, { status: 200 });
}
