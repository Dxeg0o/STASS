import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { producto } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";

// Catálogo de productos → variedades → subvariedades para el formulario de
// creación de lote en la tablet (dropdowns en cascada). Es data de referencia
// relativamente chica; se devuelve anidada para armar los selects sin múltiples
// requests, y la app la cachea.
export async function GET(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.query.producto.findMany({
    columns: { id: true, nombre: true },
    orderBy: [asc(producto.nombre)],
    with: {
      variedades: {
        columns: { id: true, nombre: true, tipo: true },
        with: {
          subvariedades: {
            columns: { id: true, nombre: true },
          },
        },
      },
    },
  });

  const productos = rows.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    variedades: [...p.variedades]
      .sort((a, b) => a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase()))
      .map((v) => ({
        id: v.id,
        nombre: v.nombre,
        tipo: v.tipo,
        subvariedades: [...v.subvariedades]
          .sort((a, b) =>
            a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase())
          )
          .map((s) => ({ id: s.id, nombre: s.nombre })),
      })),
  }));

  return NextResponse.json({ productos }, { status: 200 });
}
