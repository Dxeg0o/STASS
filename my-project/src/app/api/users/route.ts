import { NextResponse, NextRequest } from "next/server";

import { connectDb } from "@/lib/mongodb";
import User from "@/models/user";

export async function GET() {
  await connectDb();

  const users = await User.find();

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  await connectDb();
  const data = await request.json();

  const users = await User.create(data);

  return NextResponse.json(users);
}
