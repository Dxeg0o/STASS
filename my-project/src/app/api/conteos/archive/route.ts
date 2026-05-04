import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conteoArchiveIndex } from "@/db/schema";
import { verifyToken } from "@/lib/auth";

const BUCKET = "conteo-archive";
const SIGNED_URL_TTL_SECONDS = 3600;

export async function GET(request: Request) {
  // Solo usuarios autenticados pueden descargar histórico
  const auth = await verifyToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: "Parámetro date requerido en formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  // Buscar el archivo en el índice de auditoría
  const entry = await db.query.conteoArchiveIndex.findFirst({
    where: eq(conteoArchiveIndex.date, new Date(dateParam)),
  });

  if (!entry) {
    return NextResponse.json(
      { error: "No hay archivo archivado para esa fecha" },
      { status: 404 }
    );
  }

  // Generar signed URL con expiración de 1 hora usando service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(entry.filePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "No se pudo generar la URL de descarga" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    date: dateParam,
    signedUrl: data.signedUrl,
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    rowCount: entry.rowCount,
    filePath: entry.filePath,
    archivedAt: entry.archivedAt,
  });
}
