import { NextResponse, NextRequest } from "next/server";

import { connectDb } from "@/lib/mongodb";
import Analisis from "@/models/analysis";

export async function GET() {
  await connectDb();

  const analysis = await Analisis.find();

  return NextResponse.json(analysis);
}

export async function POST(request: NextRequest) {
  await connectDb();
  const data = await request.json();

  const analysis = await Analisis.create(data);

  return NextResponse.json(analysis);
}
