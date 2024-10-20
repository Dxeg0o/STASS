import { NextResponse } from "next/server";

export async function GET() {
  // Aquí manejas la lógica de la API
  return NextResponse.json({ message: "API funcionando" });
}
