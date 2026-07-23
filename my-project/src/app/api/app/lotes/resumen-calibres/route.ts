import { NextResponse } from "next/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  loteCierreCalibreBin,
  loteServicio,
  loteStats,
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
  if (loteIds.length === 0) {
    return NextResponse.json({ groups: [] }, { status: 200 });
  }

  const manualRows = await db
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
        inArray(loteCierreCalibreBin.loteId, loteIds)
      )
    )
    .orderBy(
      asc(loteCierreCalibreBin.calibreFrom),
      asc(loteCierreCalibreBin.calibreTo)
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
