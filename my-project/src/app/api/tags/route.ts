import { NextResponse, NextRequest } from "next/server";

import { connectDb } from "@/lib/mongodb";
import Etiqueta from "@/models/tags";

export async function GET() {
  await connectDb();

  const tags = await Etiqueta.find();

  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  await connectDb();
  const data = await request.json();

  const tags = await Etiqueta.create(data);

  return NextResponse.json(tags);
}
