import { NextResponse } from "next/server";
import { contenedoresDelLote } from "@/lib/lote-contenedores";

// Endpoint propio en vez de agregar los campos a /api/lotes/summary: esa ruta
// devuelve un array de dispositivos y la consumen dos vistas, asi que cambiarle
// la forma para colgarle datos del lote las rompe a las dos. Este lo usan las
// dos paginas de lote, para que el numero no se calcule de dos maneras.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ loteId: string }> }
) {
  const { loteId } = await params;
  const contenedores = await contenedoresDelLote(loteId);
  return NextResponse.json(contenedores);
}
