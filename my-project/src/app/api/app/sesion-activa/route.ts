import { NextResponse } from "next/server";
import { verifyAppKey } from "@/lib/app-auth";
import { getActiveSessionSnapshot } from "@/lib/app-session";

export async function GET(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("dispositivoIds") ?? "";
  const dispositivoIds = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const snapshot = await getActiveSessionSnapshot(dispositivoIds);
  return NextResponse.json(snapshot, { status: 200 });
}
