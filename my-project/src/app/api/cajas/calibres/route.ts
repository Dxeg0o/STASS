import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { cajaStats, cajaTotalStats, vCajaCalibreDeclarado } from "@/db/schema";
import { getCalibreSource } from "@/lib/calibre-resolver";

type CajaCalibreItem = {
  calibre_from: number | null;
  calibre_to: number | null;
  label: string;
  bins: number;
  unidades: number;
  salidas: string[] | null;
};

function measuredLabel(calibre: number) {
  return `Calibre ${calibre} cm`;
}

function declaredLabel(from: number | null, to: number | null) {
  if (from === null && to !== null) return `Calibre <${to} cm`;
  if (from !== null && to === null) return `Calibre >${from} cm`;
  if (from !== null && to !== null) return `Calibre ${from}-${to} cm`;
  return "Sin declarar";
}

// Desglose comercial de una caja. La fuente se decide una sola vez por
// servicio; el total incluye "Sin calibre" en medido para cuadrar siempre con
// caja_total_stats, que también contabiliza conteos sin perímetro.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const servicioId = searchParams.get("servicioId")?.trim();
  const cajaLoteSessionId = searchParams.get("cajaLoteSessionId")?.trim();
  if (!servicioId || !cajaLoteSessionId) {
    return NextResponse.json(
      { error: "servicioId y cajaLoteSessionId son requeridos" },
      { status: 400 }
    );
  }

  try {
    const source = await getCalibreSource(servicioId);
    if (source === "declarado") {
      const rows = await db
        .select()
        .from(vCajaCalibreDeclarado)
        .where(
          and(
            eq(vCajaCalibreDeclarado.servicioId, servicioId),
            eq(vCajaCalibreDeclarado.cajaLoteSessionId, cajaLoteSessionId)
          )
        );

      const items = rows.map((row) => ({
        calibre_from: row.calibreFrom,
        calibre_to: row.calibreTo,
        label: declaredLabel(row.calibreFrom, row.calibreTo),
        bins: Number(row.bins) || 0,
        unidades: Number(row.unidades) || 0,
        salidas: row.salidas,
      }));

      return NextResponse.json({
        source,
        items,
        total_unidades: items.reduce((sum, item) => sum + item.unidades, 0),
      });
    }

    const [totalRow] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${cajaTotalStats.countIn} + ${cajaTotalStats.countOut}), 0)::int`,
      })
      .from(cajaTotalStats)
      .where(eq(cajaTotalStats.cajaLoteSessionId, cajaLoteSessionId));
    const totalUnidades = Number(totalRow?.total) || 0;

    const rows = await db
      .select({
        calibre: cajaStats.calibre,
        unidades: sql<number>`COALESCE(SUM(${cajaStats.countIn} + ${cajaStats.countOut}), 0)::int`,
      })
      .from(cajaStats)
      .where(eq(cajaStats.cajaLoteSessionId, cajaLoteSessionId))
      .groupBy(cajaStats.calibre)
      .orderBy(cajaStats.calibre);

    const items: CajaCalibreItem[] = rows.map((row) => {
      const calibre = Number(row.calibre);
      return {
        calibre_from: calibre,
        calibre_to: calibre,
        label: measuredLabel(calibre),
        bins: 0,
        unidades: Number(row.unidades) || 0,
        salidas: null,
      };
    });
    const conCalibre = items.reduce((sum, item) => sum + item.unidades, 0);
    if (totalUnidades > conCalibre) {
      items.push({
        calibre_from: null,
        calibre_to: null,
        label: "Sin calibre",
        bins: 0,
        unidades: totalUnidades - conCalibre,
        salidas: null,
      });
    }

    return NextResponse.json({ source, items, total_unidades: totalUnidades });
  } catch (error) {
    if (error instanceof Error && error.message.includes("no encontrado")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error resolving caja calibre breakdown:", error);
    return NextResponse.json(
      { error: "No se pudo resolver el calibre de la caja" },
      { status: 500 }
    );
  }
}
