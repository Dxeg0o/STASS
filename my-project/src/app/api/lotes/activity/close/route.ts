// app/api/lotes/activity/close/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { loteSession } from "@/db/schema";
import { isNull } from "drizzle-orm";

export async function POST() {
  const now = new Date();
  await db
    .update(loteSession)
    .set({ endTime: now })
    .where(isNull(loteSession.endTime));

  return NextResponse.json({ success: true }, { status: 200 });
}
