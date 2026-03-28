import { NextResponse } from "next/server";
import { db } from "@/db";
import { empresa, usuario, proceso, conteo } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [empresas, usuarios, procesosActivos, conteos] = await Promise.all([
      db.select({ value: sql<number>`count(*)`.mapWith(Number) }).from(empresa),
      db.select({ value: sql<number>`count(*)`.mapWith(Number) }).from(usuario),
      db
        .select({ value: sql<number>`count(*)`.mapWith(Number) })
        .from(proceso)
        .where(eq(proceso.estado, "en_curso")),
      db.select({ value: sql<number>`count(*)`.mapWith(Number) }).from(conteo),
    ]);

    return NextResponse.json({
      totalEmpresas: empresas[0].value,
      totalUsuarios: usuarios[0].value,
      procesosActivos: procesosActivos[0].value,
      totalConteos: conteos[0].value,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
