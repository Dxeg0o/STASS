import { NextResponse, NextRequest } from "next/server";

import { connectDb } from "@/lib/mongodb";
import Empresa from "@/models/companies";
import mongoose from "mongoose";

export async function GET() {
  try {
    await connectDb();

    const companies = await Empresa.find();

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error during login:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  await connectDb();
  try {
    const data = await request.json();

    const companies = await Empresa.create({
      ...data,
      _id: new mongoose.Types.ObjectId().toString(),
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error during login:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 400 });
  }
}
