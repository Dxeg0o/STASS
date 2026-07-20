import { NextResponse } from "next/server";
import { verifyAppKey } from "@/lib/app-auth";
import { getCajaCountForLote } from "@/lib/app-session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: loteId } = await params;
  const count = await getCajaCountForLote(loteId);

  return NextResponse.json({ count }, { status: 200 });
}
