import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loteServicio } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";
import { fetchLotesByIds, sortLotes } from "@/lib/app-lote";

export async function GET(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const servicioId = searchParams.get("servicioId");
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

  const loteIds = [...new Set(links.map((l) => l.loteId))];
  const lotes = sortLotes(await fetchLotesByIds(loteIds));

  return NextResponse.json({ lotes }, { status: 200 });
}
