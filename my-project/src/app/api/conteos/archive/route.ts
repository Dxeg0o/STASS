import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { and, asc, eq, isNull } from "drizzle-orm";
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
  // Sin servicioId se busca el archivo del día completo (el que produce el cron
  // `archive-conteo`, con servicio_id NULL). Con servicioId se busca el
  // archivado por servicio, que puede venir partido en varios objetos.
  const servicioId = searchParams.get("servicioId");

  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: "Parámetro date requerido en formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  // Buscar los archivos en el índice de auditoría
  const entries = await db.query.conteoArchiveIndex.findMany({
    where: and(
      eq(conteoArchiveIndex.date, new Date(dateParam)),
      servicioId
        ? eq(conteoArchiveIndex.servicioId, servicioId)
        : isNull(conteoArchiveIndex.servicioId)
    ),
    orderBy: asc(conteoArchiveIndex.filePath),
  });

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "No hay archivo archivado para esa fecha" },
      { status: 404 }
    );
  }

  // Generar signed URLs con expiración de 1 hora usando service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const archivos = await Promise.all(
    entries.map(async (entry) => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(entry.filePath, SIGNED_URL_TTL_SECONDS);
      if (error || !data?.signedUrl) return null;
      return {
        filePath: entry.filePath,
        signedUrl: data.signedUrl,
        rowCount: entry.rowCount,
        archivedAt: entry.archivedAt,
      };
    })
  );

  if (archivos.some((archivo) => archivo === null)) {
    return NextResponse.json(
      { error: "No se pudo generar la URL de descarga" },
      { status: 500 }
    );
  }

  const partes = archivos as NonNullable<(typeof archivos)[number]>[];

  return NextResponse.json({
    date: dateParam,
    servicioId,
    // Campos planos del primer archivo: mantienen la forma previa de la
    // respuesta para el caso de un único objeto por día.
    signedUrl: partes[0].signedUrl,
    filePath: partes[0].filePath,
    archivedAt: partes[0].archivedAt,
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    rowCount: partes.reduce((total, parte) => total + parte.rowCount, 0),
    archivos: partes,
  });
}
