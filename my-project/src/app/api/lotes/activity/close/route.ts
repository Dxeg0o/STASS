// app/api/lotes/activity/close/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cajaLoteSession, loteSession } from "@/db/schema";
import { and, inArray, isNull } from "drizzle-orm";

export async function POST() {
  const now = new Date();
  const openSessions = await db
    .select({ id: loteSession.id })
    .from(loteSession)
    .where(isNull(loteSession.endTime));
  const openSessionIds = openSessions.map((session) => session.id);

  if (openSessionIds.length > 0) {
    await db
      .update(cajaLoteSession)
      .set({ retiradoAt: now })
      .where(
        and(
          inArray(cajaLoteSession.loteSessionId, openSessionIds),
          isNull(cajaLoteSession.retiradoAt)
        )
      );
  }

  await db
    .update(loteSession)
    .set({ endTime: now })
    .where(isNull(loteSession.endTime));

  return NextResponse.json({ success: true }, { status: 200 });
}
