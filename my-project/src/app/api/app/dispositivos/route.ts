import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dispositivo, dispositivoServicio } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";

// Dispositivos activos asignados a un servicio (sin filtrar por vigencia
// temporal — igual que hoy hace el cliente Supabase, que solo filtra
// dispositivo.activo). Se mantiene así a propósito: no filtramos por
// fecha_termino acá, solo lo hace el índice parcial de unicidad de salida.
//
// salida_orden/salida_nombre: identidad de salida física en el calibrador (plan de
// calibre por salida). Servicios que todavía no configuraron salidas devuelven estos
// campos en null — la tablet debe degradar a mostrar el nombre del dispositivo, no
// romper.
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
      salidaOrden: dispositivoServicio.salidaOrden,
      salidaNombre: dispositivoServicio.salidaNombre,
    })
    .from(dispositivoServicio)
    .innerJoin(dispositivo, eq(dispositivo.id, dispositivoServicio.dispositivoId))
    .where(eq(dispositivoServicio.servicioId, servicioId));

  const dispositivos = rows
    .filter((d) => d.activo)
    .sort((a, b) => {
      // Con salida configurada: ordenar por número de salida. Sin salida: al final,
      // por nombre — así un servicio a mitad de migrar a salidas no queda desordenado.
      if (a.salidaOrden != null && b.salidaOrden != null) {
        return a.salidaOrden - b.salidaOrden;
      }
      if (a.salidaOrden != null) return -1;
      if (b.salidaOrden != null) return 1;
      return a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase());
    })
    .map((d) => ({
      id: d.id,
      nombre: d.nombre,
      tipo: d.tipo,
      activo: d.activo,
      salida_orden: d.salidaOrden,
      salida_nombre: d.salidaNombre,
    }));

  return NextResponse.json({ dispositivos }, { status: 200 });
}
