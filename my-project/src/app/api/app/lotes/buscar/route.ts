import { NextResponse } from "next/server";
import { verifyAppKey } from "@/lib/app-auth";
import { fetchLoteByCodigo } from "@/lib/app-lote";

// Búsqueda por codigo_lote exacto (escaneo de QR o ingreso manual).
export async function GET(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get("codigo");
  if (!codigo) {
    return NextResponse.json({ error: "codigo es requerido" }, { status: 400 });
  }

  const lote = await fetchLoteByCodigo(codigo);
  return NextResponse.json({ lote }, { status: 200 });
}
