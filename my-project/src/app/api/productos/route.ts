import { db } from "@/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const productos = await db.query.producto.findMany({
      with: { variedades: { columns: { id: true, nombre: true } } },
    });
    return NextResponse.json(productos);
  } catch (error) {
    console.error("Error fetching productos:", error);
    return NextResponse.json(
      { error: "Failed to fetch productos" },
      { status: 500 }
    );
  }
}
