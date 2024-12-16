import { NextResponse, NextRequest } from "next/server";

import { connectDb } from "@/lib/mongodb";
import Empresa from "@/models/companies";
import mongoose from "mongoose";
export async function GET() {
  await connectDb();

  const companies = await Empresa.find();

  return NextResponse.json(companies);
}

export async function POST(request: NextRequest) {
  await connectDb();
  const data = await request.json();

  const companies = await Empresa.create({
    ...data,
    _id: new mongoose.Types.ObjectId().toString(),
  });

  return NextResponse.json(companies);
}
