import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db";
import { empresa } from "@/db/schema";

export async function GET() {
  try {
    const companies = await db.select().from(empresa);
    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ error: "Error fetching companies" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const [created] = await db
      .insert(empresa)
      .values({
        nombre: data.nombre,
        pais: data.pais,
        createdAt: data.fechaRegistro ? new Date(data.fechaRegistro) : new Date(),
      })
      .returning();
    return NextResponse.json(created);
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json({ error: "Error creating company" }, { status: 400 });
  }
}
