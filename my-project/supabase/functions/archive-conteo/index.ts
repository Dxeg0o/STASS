import { createClient } from "jsr:@supabase/supabase-js@2";

// ── Configuración ─────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("ARCHIVE_CRON_SECRET");
const BUCKET = "conteo-archive";
const PAGE_SIZE = 50_000;

// ── Utilidades ────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function targetDate(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  cutoff.setUTCHours(0, 0, 0, 0);
  const end = new Date(cutoff);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: cutoff, end, label: toISODate(cutoff) };
}

function buildCsvRow(row: Record<string, unknown>): string {
  return [
    row.ts,
    row.dispositivo_id,
    row.servicio_id,
    row.lote_id,
    row.caja_lote_session_id ?? "",
    row.perimeter,
    row.direction,
  ]
    .map(String)
    .join(",");
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Lógica principal ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Verificar secret de invocación — rechaza cualquier llamada no autorizada
  const bearer = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!CRON_SECRET || bearer !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { start, end, label } = targetDate();

  // Verificar si ya fue archivado (idempotente)
  const { data: existing } = await supabase
    .from("conteo_archive_index")
    .select("id")
    .eq("date", label)
    .maybeSingle();

  if (existing) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "already archived", date: label }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Paginar conteo y construir CSV en memoria
  const csvLines: string[] = [
    "ts,dispositivo_id,servicio_id,lote_id,caja_lote_session_id,perimeter,direction",
  ];
  let totalRows = 0;
  let lastTs: string | null = null;
  let lastId: string | null = null;

  while (true) {
    let query = supabase
      .from("conteo")
      .select("ts,dispositivo_id,servicio_id,lote_id,caja_lote_session_id,perimeter,direction")
      .gte("ts", start.toISOString())
      .lt("ts", end.toISOString())
      .order("ts", { ascending: true })
      .order("dispositivo_id", { ascending: true })
      .limit(PAGE_SIZE);

    if (lastTs !== null && lastId !== null) {
      query = query.or(`ts.gt.${lastTs},and(ts.eq.${lastTs},dispositivo_id.gt.${lastId})`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(`DB query failed: ${error.message}`);
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      csvLines.push(buildCsvRow(row as Record<string, unknown>));
    }

    totalRows += rows.length;
    const last = rows[rows.length - 1] as Record<string, unknown>;
    lastTs = String(last.ts);
    lastId = String(last.dispositivo_id);

    if (rows.length < PAGE_SIZE) break;
  }

  if (totalRows === 0) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "no data for date", date: label }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Comprimir con gzip
  const csvBytes = new TextEncoder().encode(csvLines.join("\n"));
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(csvBytes);
  writer.close();
  const compressed = new Uint8Array(
    await new Response(stream.readable).arrayBuffer()
  );

  const checksum = await sha256Hex(compressed);
  const [year, month] = label.split("-");
  const filePath = `${year}/${month}/conteo-${label}.csv.gz`;

  // Subir a Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, compressed, {
      contentType: "application/gzip",
      upsert: false,
    });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  // Verificar integridad: contar filas en DB contra CSV
  const { count: dbCount } = await supabase
    .from("conteo")
    .select("*", { count: "exact", head: true })
    .gte("ts", start.toISOString())
    .lt("ts", end.toISOString());

  if (dbCount !== totalRows) {
    // Eliminar el archivo subido para no dejar estado inconsistente
    await supabase.storage.from(BUCKET).remove([filePath]);
    throw new Error(
      `Integrity check failed: DB=${dbCount}, CSV=${totalRows}. Archive rolled back.`
    );
  }

  // Eliminar de conteo (solo si todo lo anterior fue exitoso)
  const { error: deleteError } = await supabase
    .from("conteo")
    .delete()
    .gte("ts", start.toISOString())
    .lt("ts", end.toISOString());

  if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);

  // Registrar en el índice de auditoría
  const { error: indexError } = await supabase
    .from("conteo_archive_index")
    .insert({ date: label, file_path: filePath, row_count: totalRows, checksum });

  if (indexError) throw new Error(`Index insert failed: ${indexError.message}`);

  return new Response(
    JSON.stringify({ archived: true, date: label, rows: totalRows, filePath }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
