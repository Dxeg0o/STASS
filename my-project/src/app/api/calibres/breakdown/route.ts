import { NextResponse } from "next/server";
import { getCalibreBreakdown } from "@/lib/calibre-resolver";

// Fuente comercial de calibre. A diferencia de /api/stats/distribution, este
// endpoint no representa el perímetro técnico: resuelve la fuente según
// servicio.modo_calibre para que las pantallas y correos de cliente no tengan
// que conocer la dualidad medido/declarado.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const servicioId = searchParams.get("servicioId")?.trim();
  const loteId = searchParams.get("loteId")?.trim();

  if (!servicioId) {
    return NextResponse.json(
      { error: "servicioId es requerido" },
      { status: 400 }
    );
  }

  try {
    const breakdown = await getCalibreBreakdown(servicioId, {
      ...(loteId ? { loteId } : {}),
    });

    return NextResponse.json({
      source: breakdown.source,
      rows: breakdown.rows.map((row) => ({
        calibre_from: row.calibreFrom,
        calibre_to: row.calibreTo,
        label: row.label,
        bins: row.bins,
        unidades: row.unidades,
        salidas: row.salidas,
      })),
      sin_declarar: breakdown.sinDeclarar ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("no encontrado")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error resolving calibre breakdown:", error);
    return NextResponse.json(
      { error: "No se pudo resolver el calibre" },
      { status: 500 }
    );
  }
}
