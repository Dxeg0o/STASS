import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cajaLoteSession } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";
import { serializeCajaLoteSession } from "@/lib/app-serialize";

interface Body {
  retirado_at?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let raw: unknown = {};
  try {
    const text = await request.text();
    raw = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const body = raw as Body;

  const retiradoAt =
    typeof body.retirado_at === "string" ? new Date(body.retirado_at) : new Date();
  if (isNaN(retiradoAt.getTime())) {
    return NextResponse.json({ error: "retirado_at inválido" }, { status: 400 });
  }

  const [updated] = await db
    .update(cajaLoteSession)
    .set({ retiradoAt })
    .where(eq(cajaLoteSession.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "caja_lote_session no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json(serializeCajaLoteSession(updated), { status: 200 });
}
