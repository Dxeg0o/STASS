import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { empresa } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";

export async function GET(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({ id: empresa.id, nombre: empresa.nombre, pais: empresa.pais })
    .from(empresa)
    .orderBy(asc(empresa.nombre));

  return NextResponse.json({ empresas: rows }, { status: 200 });
}
