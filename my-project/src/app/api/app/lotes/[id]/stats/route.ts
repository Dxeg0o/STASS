import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { loteStats } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";
import { serializeLoteStats } from "@/lib/app-serialize";

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
    .from(loteStats)
    .where(and(eq(loteStats.loteId, loteId), eq(loteStats.servicioId, servicioId)))
    .orderBy(asc(loteStats.calibre));

  return NextResponse.json(
    { stats: rows.map(serializeLoteStats) },
    { status: 200 }
  );
}
