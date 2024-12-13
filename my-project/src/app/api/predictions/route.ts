import { NextResponse, NextRequest } from "next/server";

import { connectDb } from "@/lib/mongodb";
import Prediccion from "@/models/predictions";

export async function GET() {
  await connectDb();

  const predictions = await Prediccion.find();

  return NextResponse.json(predictions);
}

export async function POST(request: NextRequest) {
  await connectDb();
  const data = await request.json();

  const predictions = await Prediccion.create(data);

  return NextResponse.json(predictions);
}
