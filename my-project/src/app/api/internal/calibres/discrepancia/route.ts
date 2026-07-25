import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { vLoteCalibreDiscrepancia } from "@/db/schema";
import { verifyAdmin } from "@/lib/auth";

// Uso interno QB: contrasta el calibre que midió el sistema con el rango que
// declaró la operaria. Nunca se usa como fuente de un reporte de cliente.
export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const servicioId = searchParams.get("servicioId")?.trim();
  const loteId = searchParams.get("loteId")?.trim();
  if (!servicioId) {
    return NextResponse.json(
      { error: "servicioId es requerido" },
      { status: 400 }
    );
  }

  const rows = await db
    .select()
    .from(vLoteCalibreDiscrepancia)
    .where(
      loteId
        ? and(
            eq(vLoteCalibreDiscrepancia.servicioId, servicioId),
            eq(vLoteCalibreDiscrepancia.loteId, loteId)
          )
        : eq(vLoteCalibreDiscrepancia.servicioId, servicioId)
    );

  const items = rows.map((row) => {
    const total = Number(row.total) || 0;
    const dentroDeRango = Number(row.dentroDeRango) || 0;
    return {
      lote_id: row.loteId,
      dispositivo_id: row.dispositivoId,
      tramo_id: row.tramoId,
      calibre_from: row.calibreFrom,
      calibre_to: row.calibreTo,
      total,
      dentro_de_rango: dentroDeRango,
      bajo: Number(row.bajo) || 0,
      sobre: Number(row.sobre) || 0,
      porcentaje_dentro: total > 0 ? (dentroDeRango / total) * 100 : 0,
    };
  });

  const total = items.reduce((sum, item) => sum + item.total, 0);
  const dentroDeRango = items.reduce(
    (sum, item) => sum + item.dentro_de_rango,
    0
  );

  return NextResponse.json({
    items,
    resumen: {
      total,
      dentro_de_rango: dentroDeRango,
      porcentaje_dentro: total > 0 ? (dentroDeRango / total) * 100 : 0,
    },
  });
}
