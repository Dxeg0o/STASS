import { NextResponse } from "next/server";
import { db } from "@/db";
import { tipoProceso } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyEmpresaAdminFromPayload, verifyToken } from "@/lib/auth";

async function authorizeEmpresaAccess(req: Request, empresaId: string) {
  const payload = await verifyToken(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await verifyEmpresaAdminFromPayload(payload, empresaId);
  if (!allowed) {
    return NextResponse.json(
      { error: "No tienes permisos para esta empresa" },
      { status: 403 }
    );
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId es requerido" },
      { status: 400 }
    );
  }

  const authError = await authorizeEmpresaAccess(request, empresaId);
  if (authError) return authError;

  const tipos = await db
    .select()
    .from(tipoProceso)
    .where(eq(tipoProceso.empresaId, empresaId));

  return NextResponse.json(tipos);
}

export async function POST(request: Request) {
  const body = await request.json();
  const empresaId =
    typeof body.empresaId === "string" ? body.empresaId : null;
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";

  if (!empresaId || !nombre) {
    return NextResponse.json(
      { error: "empresaId y nombre son requeridos" },
      { status: 400 }
    );
  }

  const authError = await authorizeEmpresaAccess(request, empresaId);
  if (authError) return authError;

  const [created] = await db
    .insert(tipoProceso)
    .values({ empresaId, nombre })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
