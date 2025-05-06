// app/api/lotes/activity/route.ts
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { LoteActivity } from "@/models/loteactivity";

export async function POST(request: Request) {
  const { loteId /*, prevLoteId*/ } = await request.json();
  if (!loteId) {
    return NextResponse.json({ error: "loteId is required" }, { status: 400 });
  }

  await connectDb();

  const now = new Date();

  // Cerrar cualquier sesión abierta (sin filtrar por lote) para evitar
  // que queden sesiones “huérfanas”.
  await LoteActivity.findOneAndUpdate({ endTime: null }, { endTime: now });

  // Abrir nueva sesión
  const activity = await LoteActivity.create({
    loteId,
    startTime: now,
    endTime: null,
  });

  return NextResponse.json(activity, { status: 201 });
}
