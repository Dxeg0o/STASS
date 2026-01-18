import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/mongodb";
import { Conteo } from "@/models/conteo";
import { LoteActivity } from "@/models/loteactivity";

interface DistributionPoint {
  perimeter: number;
  count: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const servicioId = searchParams.get("servicioId");
  const loteIds = [
    ...searchParams.getAll("loteId"),
    ...(searchParams.get("loteIds")?.split(",") ?? []),
  ]
    .map((id) => id.trim())
    .filter(Boolean);

  if (!servicioId) {
    return NextResponse.json(
      { error: "servicioId es requerido" },
      { status: 400 }
    );
  }

  if (loteIds.length === 0) {
    return NextResponse.json({ data: [], series: [] });
  }

  await connectDb();

  const loteObjectIds = loteIds.map((id) => new mongoose.Types.ObjectId(id));
  const activities = await LoteActivity.find({
    loteId: { $in: loteObjectIds },
  }).lean();

  const now = new Date();
  const rangesByLote = new Map<
    string,
    Array<{ startTime: Date; endTime: Date | null }>
  >();

  for (const activity of activities) {
    const key = activity.loteId.toString();
    const list = rangesByLote.get(key) ?? [];
    list.push({ startTime: activity.startTime, endTime: activity.endTime });
    rangesByLote.set(key, list);
  }

  const facets: Record<string, any[]> = {};

  for (const loteId of loteIds) {
    const ranges = rangesByLote.get(loteId) ?? [];
    const orConditions = ranges.map(({ startTime, endTime }) => ({
      timestamp: { $gte: startTime, $lte: endTime ?? now },
    }));

    const matchStage = orConditions.length
      ? {
          $match: {
            servicioId,
            $or: orConditions,
          },
        }
      : {
          $match: {
            _id: { $exists: false },
          },
        };

    facets[loteId] = [
      matchStage,
      {
        $group: {
          _id: { $round: ["$perimeter", 1] },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          perimeter: "$_id",
          count: 1,
        },
      },
      { $sort: { perimeter: 1 } },
    ];
  }

  const [result] = await Conteo.aggregate([{ $facet: facets }]).allowDiskUse(
    true
  );

  const perimeterMap = new Map<number, Record<string, number>>();

  for (const loteId of loteIds) {
    const points = (result?.[loteId] ?? []) as DistributionPoint[];
    for (const point of points) {
      if (
        point.perimeter === null ||
        point.perimeter === undefined ||
        isNaN(point.perimeter)
      ) {
        continue;
      }
      const perimeter = Number(point.perimeter.toFixed(1));
      const entry = perimeterMap.get(perimeter) ?? { perimeter };
      entry[loteId] = point.count;
      perimeterMap.set(perimeter, entry);
    }
  }

  const data = Array.from(perimeterMap.values()).sort(
    (a, b) => a.perimeter - b.perimeter
  );

  for (const entry of data) {
    for (const loteId of loteIds) {
      if (entry[loteId] === undefined) {
        entry[loteId] = 0;
      }
    }
  }

  return NextResponse.json({
    data,
    series: loteIds.map((loteId) => ({ loteId })),
  });
}
