// app/api/lotes/activity/close/route.ts
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { LoteActivity } from "@/models/loteactivity";

export async function POST() {
  await connectDb();

  const now = new Date();
  // Cerrar única sesión abierta que quede sin endTime
  await LoteActivity.findOneAndUpdate({ endTime: null }, { endTime: now });

  return NextResponse.json({ success: true }, { status: 200 });
}
