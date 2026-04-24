import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "El registro publico de empresas esta deshabilitado" },
    { status: 403 }
  );
}

export async function POST(_request: NextRequest) {
  void _request;
  return NextResponse.json(
    { error: "La creacion de empresas solo esta disponible para superadmin" },
    { status: 403 }
  );
}
