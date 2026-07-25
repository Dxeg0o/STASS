import { NextResponse } from "next/server";
import { verifyAppKey } from "@/lib/app-auth";
import { openLoteSessionExclusive } from "@/lib/app-session";
import { serializeLoteSession } from "@/lib/app-serialize";

interface Body {
  lote_id?: unknown;
  dispositivo_id?: unknown;
  id?: unknown;
  start_time?: unknown;
}

export async function POST(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const body = raw as Body;

  if (typeof body.lote_id !== "string" || typeof body.dispositivo_id !== "string") {
    return NextResponse.json(
      { error: "lote_id y dispositivo_id son requeridos" },
      { status: 400 }
    );
  }

  const startTime =
    typeof body.start_time === "string" ? new Date(body.start_time) : new Date();
  if (isNaN(startTime.getTime())) {
    return NextResponse.json({ error: "start_time inválido" }, { status: 400 });
  }

  // Abrir una sesión implica cerrar la que el dispositivo tuviera abierta: es
  // la misma frontera y tiene que resolverse en una sola transacción. Que el
  // cierre lo decidiera el cliente era el origen de las ventanas solapadas con
  // dos tablets sobre los mismos dispositivos (ver openLoteSessionExclusive).
  const { session, alreadyExisted } = await openLoteSessionExclusive({
    ...(typeof body.id === "string" ? { id: body.id } : {}),
    loteId: body.lote_id,
    dispositivoId: body.dispositivo_id,
    startTime,
  });

  // Reintento offline con el mismo id: idempotente, se devuelve lo que ya
  // quedó guardado (no un error).
  return NextResponse.json(serializeLoteSession(session), {
    status: alreadyExisted ? 200 : 201,
  });
}
