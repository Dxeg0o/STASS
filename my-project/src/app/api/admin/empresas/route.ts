import { NextResponse } from "next/server";
import { db } from "@/db";
import { empresa } from "@/db/schema";
import { sql } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const empresas = await db
      .select({
        id: empresa.id,
        nombre: empresa.nombre,
        pais: empresa.pais,
        createdAt: empresa.createdAt,
        usuarioCount: sql<number>`(
          SELECT count(*) FROM empresa_usuario
          WHERE empresa_usuario.empresa_id = ${empresa.id}
        )`.mapWith(Number),
        procesoCount: sql<number>`(
          SELECT count(*) FROM proceso
          WHERE proceso.empresa_id = ${empresa.id}
        )`.mapWith(Number),
        servicioCount: sql<number>`(
          SELECT count(*) FROM servicio
          WHERE servicio.empresa_id = ${empresa.id}
        )`.mapWith(Number),
      })
      .from(empresa);

    return NextResponse.json(empresas);
  } catch (error) {
    console.error("Error fetching empresas:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { nombre, pais } = await req.json();
    if (!nombre) {
      return NextResponse.json(
        { error: "nombre is required" },
        { status: 400 }
      );
    }

    const [newEmpresa] = await db
      .insert(empresa)
      .values({ nombre, pais })
      .returning();

    return NextResponse.json(newEmpresa, { status: 201 });
  } catch (error) {
    console.error("Error creating empresa:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
