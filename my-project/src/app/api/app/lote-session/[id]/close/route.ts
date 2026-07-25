import { NextResponse } from "next/server";
import { verifyAppKey } from "@/lib/app-auth";
import { closeLoteSessionIdempotent } from "@/lib/app-session";
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

  // No pisa un end_time ya resuelto: el POST de apertura cierra la sesión
  // anterior por su cuenta, así que este cierre puede llegar cuando la frontera
  // ya está bien puesta. Moverla sería corromper la ventana.
  const session = await closeLoteSessionIdempotent(id, endTime);

  if (!session) {
    return NextResponse.json({ error: "lote_session no encontrada" }, { status: 404 });
  }

  return NextResponse.json(serializeLoteSession(session), { status: 200 });
}
