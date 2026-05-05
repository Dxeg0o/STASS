import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/db";
import { producto, subvariedad, variedad } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export const runtime = "nodejs";

type ImportStats = {
  filasProcesadas: number;
  filasOmitidas: number;
  productosCreados: number;
  variedadesCreadas: number;
  subvariedadesCreadas: number;
};

const normalizeHeader = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const toCellText = (value: unknown) => String(value ?? "").trim();

const getCell = (
  row: Record<string, string>,
  aliases: string[]
): string => {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value) return value;
  }
  return "";
};

const splitSubvariedades = (value: string) =>
  value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

async function getOrCreateProducto(nombre: string) {
  const [existing] = await db
    .select()
    .from(producto)
    .where(eq(producto.nombre, nombre))
    .limit(1);

  if (existing) return { record: existing, created: false };

  const [created] = await db
    .insert(producto)
    .values({ nombre })
    .onConflictDoNothing()
    .returning();

  if (created) return { record: created, created: true };

  const [record] = await db
    .select()
    .from(producto)
    .where(eq(producto.nombre, nombre))
    .limit(1);

  return { record, created: false };
}

async function getOrCreateVariedad(
  nombre: string,
  productoId: string,
  tipo: string
) {
  const [existing] = await db
    .select()
    .from(variedad)
    .where(and(eq(variedad.nombre, nombre), eq(variedad.productoId, productoId)))
    .limit(1);

  if (existing) {
    if (!existing.tipo && tipo) {
      const [updated] = await db
        .update(variedad)
        .set({ tipo })
        .where(eq(variedad.id, existing.id))
        .returning();
      return { record: updated ?? existing, created: false };
    }

    return { record: existing, created: false };
  }

  const [created] = await db
    .insert(variedad)
    .values({ nombre, productoId, tipo: tipo || null })
    .onConflictDoNothing()
    .returning();

  if (created) return { record: created, created: true };

  const [record] = await db
    .select()
    .from(variedad)
    .where(and(eq(variedad.nombre, nombre), eq(variedad.productoId, productoId)))
    .limit(1);

  return { record, created: false };
}

async function createSubvariedadIfMissing(nombre: string, variedadId: string) {
  const [existing] = await db
    .select()
    .from(subvariedad)
    .where(
      and(
        eq(subvariedad.nombre, nombre),
        eq(subvariedad.variedadId, variedadId)
      )
    )
    .limit(1);

  if (existing) return false;

  const [created] = await db
    .insert(subvariedad)
    .values({ nombre, variedadId })
    .onConflictDoNothing()
    .returning();

  return Boolean(created);
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return NextResponse.json(
        { error: "El archivo no tiene hojas para importar" },
        { status: 400 }
      );
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[firstSheetName],
      { defval: "", raw: false }
    );

    const stats: ImportStats = {
      filasProcesadas: 0,
      filasOmitidas: 0,
      productosCreados: 0,
      variedadesCreadas: 0,
      subvariedadesCreadas: 0,
    };

    for (const rawRow of rows) {
      const row = Object.fromEntries(
        Object.entries(rawRow).map(([key, value]) => [
          normalizeHeader(key),
          toCellText(value),
        ])
      );

      const productoNombre = getCell(row, ["producto", "productos", "product"]);
      const variedadNombre = getCell(row, [
        "variedad",
        "variedades",
        "variety",
      ]);
      const tipo = getCell(row, ["tipo", "type", "categoria", "categoría"]);
      const subvariedadText = getCell(row, [
        "subvariedad",
        "subvariedades",
        "sub variedad",
        "sub-variedad",
        "sub_variedad",
        "subvariety",
      ]);

      if (!productoNombre || !variedadNombre) {
        stats.filasOmitidas += 1;
        continue;
      }

      const productoResult = await getOrCreateProducto(productoNombre);
      if (!productoResult.record) {
        stats.filasOmitidas += 1;
        continue;
      }
      if (productoResult.created) stats.productosCreados += 1;

      const variedadResult = await getOrCreateVariedad(
        variedadNombre,
        productoResult.record.id,
        tipo
      );
      if (!variedadResult.record) {
        stats.filasOmitidas += 1;
        continue;
      }
      if (variedadResult.created) stats.variedadesCreadas += 1;

      for (const subvariedadNombre of splitSubvariedades(subvariedadText)) {
        const created = await createSubvariedadIfMissing(
          subvariedadNombre,
          variedadResult.record.id
        );
        if (created) stats.subvariedadesCreadas += 1;
      }

      stats.filasProcesadas += 1;
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error importing productos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
