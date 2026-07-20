import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dispositivo, dispositivoServicio } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";

// Dispositivos activos asignados a un servicio (sin filtrar por vigencia
// temporal — igual que hoy hace el cliente Supabase, que solo filtra
// dispositivo.activo).
export async function GET(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const servicioId = searchParams.get("servicioId");
  if (!servicioId) {
    return NextResponse.json(
      { error: "servicioId es requerido" },
      { status: 400 }
    );
  }

  const rows = await db
    .select({
      id: dispositivo.id,
      nombre: dispositivo.nombre,
      tipo: dispositivo.tipo,
      activo: dispositivo.activo,
    })
    .from(dispositivoServicio)
    .innerJoin(dispositivo, eq(dispositivo.id, dispositivoServicio.dispositivoId))
    .where(eq(dispositivoServicio.servicioId, servicioId));

  const dispositivos = rows
    .filter((d) => d.activo)
    .sort((a, b) => a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase()));

  return NextResponse.json({ dispositivos }, { status: 200 });
}
