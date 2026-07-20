import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loteSession } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";
import { serializeLoteSession } from "@/lib/app-serialize";

interface Body {
  end_time?: unknown;
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

  const endTime =
    typeof body.end_time === "string" ? new Date(body.end_time) : new Date();
  if (isNaN(endTime.getTime())) {
    return NextResponse.json({ error: "end_time inválido" }, { status: 400 });
  }

  const [updated] = await db
    .update(loteSession)
    .set({ endTime })
    .where(eq(loteSession.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "lote_session no encontrada" }, { status: 404 });
  }

  return NextResponse.json(serializeLoteSession(updated), { status: 200 });
}
