import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { Lote } from "@/models/lotes";
import { LoteActivity } from "@/models/loteactivity";
import { Conteo } from "@/models/conteo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  const daysParam = searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : null;

  if (!empresaId) {
    return NextResponse.json({ error: "empresaId is required" }, { status: 400 });
  }

  await connectDb();

  const lotes = await Lote.find({ empresaId }, { _id: 1 }).lean();
  if (lotes.length === 0) {
    return NextResponse.json({ total: 0, perHour: [] });
  }

  const loteIds = lotes.map((l) => l._id);
  const activities = await LoteActivity.find({ loteId: { $in: loteIds } }).lean();
  if (activities.length === 0) {
    return NextResponse.json({ total: 0, perHour: [] });
  }

  const now = new Date();
  const startLimit = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : new Date(0);

  const orConds = activities.map(({ startTime, endTime }) => ({
    timestamp: {
      $gte: startTime > startLimit ? startTime : startLimit,
      $lte: endTime ?? now,
    },
  }));

  const matchStage = { $or: orConds };

  const perHour = await Conteo.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" },
          day: { $dayOfMonth: "$timestamp" },
          hour: { $hour: "$timestamp" },
        },
        total: { $sum: { $add: ["$countIn", "$countOut"] } },
      },
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
        "_id.day": 1,
        "_id.hour": 1,
      },
    },
  ]);

  const total = perHour.reduce((sum, r) => sum + r.total, 0);

  return NextResponse.json({ total, perHour });
}
