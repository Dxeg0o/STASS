/**
 * Archiva a Storage y borra de `conteo` los conteos brutos de UN servicio.
 *
 * Es el trabajo que debía haber hecho el cron `archive-conteo-daily`, que nunca
 * archivó nada: `conteo_archive_index` está vacío y `conteo` acumula 65M filas.
 * El cron falla dentro de la edge function (`supabase/functions/archive-conteo`)
 * porque filtra sólo por `ts` —que no es columna líder de ningún índice— contra
 * el statement_timeout de 8 s de PostgREST, y arma el CSV entero en memoria.
 *
 * Este script evita las tres cosas: filtra siempre por `servicio_id` (usa
 * `idx_conteo_servicio`), va por conexión directa sin ese timeout, y hace COPY
 * en streaming a disco.
 *
 * Dos fases separadas a propósito, para poder revisar el archivo antes de
 * borrar nada:
 *
 *   npm run archive:servicio -- --fase export                 # dry-run
 *   npm run archive:servicio -- --fase export --apply --yes   # sube a Storage
 *   npm run archive:servicio -- --fase delete                 # dry-run
 *   npm run archive:servicio -- --fase delete --apply --yes   # borra de conteo
 *
 * La fase `delete` sólo borra días que ya estén registrados en
 * `conteo_archive_index` para este servicio, y verifica el archivo (filas y
 * SHA-256) contra Storage antes de tocar cada día.
 */
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip, gunzipSync } from "node:zlib";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

type Sql = postgres.Sql<Record<string, unknown>>;

// ── Scope: un único servicio, fijo en el código ──────────────────────────────
// El nombre se valida contra la base antes de escribir nada: si el UUID apunta
// a otro servicio, el script aborta en vez de archivar el equivocado.
const SERVICE_ID = "0ed78e32-1ecf-45f6-ac4f-c93386d0a31d";
const SERVICE_NAME = "Lavado de Exportación Pelchuquín 2026";

/**
 * `perimeter_recal_runs` tiene un repair `validated` sobre este servicio y el
 * trigger `perimeter_recal_guard_delete` aborta (SQLSTATE 55000) cualquier
 * DELETE de filas anteriores a su `cutoff_ts` — 11,1M de las 31,1M — salvo que
 * la transacción se identifique con el repair_id. No se cambia el estado del
 * run: sigue siendo el registro histórico de la recalibración.
 */
const REPAIR_ID = "pelchuquin-perimeter-2026-06-03";

const BUCKET = "conteo-archive";
const OUT_DIR = join(process.cwd(), "outputs", "archive_pelchuquin");
/** Filas por objeto. Tope del bucket: 100 MB; 400k filas comprimen muy por debajo. */
const PART_ROWS = 400_000;
const MAX_PART_BYTES = 90 * 1024 * 1024;
/** Un trozo de 400k filas tarda ~1-2 min; 15 min es un cuelgue, no lentitud. */
const COPY_TIMEOUT_MS = 15 * 60 * 1000;
/** Los triggers de `conteo` son statement-level con transition table (`old_rows`). */
const DELETE_BATCH = 250_000;

/**
 * Orden exacto de columnas del CSV. `origen` y `correccion_id` existen en la
 * tabla real pero no en src/db/schema.ts ni en el CSV de la edge function;
 * archivar sin ellas sería pérdida de datos irreversible.
 */
const COLUMNS = [
  "ts",
  "servicio_id",
  "lote_id",
  "dispositivo_id",
  "caja_lote_session_id",
  "perimeter",
  "direction",
  "origen",
  "correccion_id",
] as const;

type DiaManifiesto = {
  dia: string;
  filas: number;
  partes: { filePath: string; localPath: string; bytes: number; checksum: string; filas: number }[];
};

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function databaseUrl() {
  // Conexión directa: el pooler serverless corta transacciones largas, y este
  // job hace COPY de días de más de un millón de filas.
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_POOLER;
  if (!url) throw new Error("Falta DATABASE_URL o DATABASE_URL_POOLER");
  return url;
}

/** Rechaza si la promesa no resuelve a tiempo, para no colgarse en silencio. */
async function conVigilante<T>(que: string, ms: number, promesa: Promise<T>): Promise<T> {
  let temporizador: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promesa,
      new Promise<never>((_, reject) => {
        temporizador = setTimeout(
          () => reject(new Error(`${que} superó ${Math.round(ms / 60000)} min sin terminar`)),
          ms
        );
      }),
    ]);
  } finally {
    if (temporizador) clearTimeout(temporizador);
  }
}

function objectPath(dia: string, parte: number, totalPartes: number) {
  const [year, month] = dia.split("-");
  const suffix = totalPartes > 1 ? `.part${String(parte).padStart(2, "0")}` : "";
  // Prefijo `servicio/…`: no colisiona con el `YYYY/…` que usa el cron diario.
  return `servicio/${SERVICE_ID}/${year}/${month}/conteo-${dia}${suffix}.csv.gz`;
}

// ── Guardas ─────────────────────────────────────────────────────────────────

async function readService(sql: Sql) {
  const rows = await sql<{ id: string; nombre: string; estado: string }[]>`
    SELECT id, nombre, estado FROM servicio WHERE id = ${SERVICE_ID}
  `;
  if (rows.length !== 1) throw new Error(`Servicio no encontrado: ${SERVICE_ID}`);
  if (rows[0].nombre !== SERVICE_NAME) {
    throw new Error(
      `El servicio ${SERVICE_ID} se llama "${rows[0].nombre}", se esperaba "${SERVICE_NAME}"`
    );
  }
  if (rows[0].estado !== "completado") {
    throw new Error(`El servicio está en estado "${rows[0].estado}": sólo se archiva un servicio completado`);
  }
  return rows[0];
}

/**
 * La tabla real tiene columnas que el repo no declara. Si aparece una nueva,
 * el CSV quedaría incompleto y el borrado sería irreversible: mejor abortar.
 */
async function assertSchema(sql: Sql) {
  const rows = await sql<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conteo'
    ORDER BY ordinal_position
  `;
  const actual = new Set(rows.map((row) => row.column_name));
  const faltantes = COLUMNS.filter((column) => !actual.has(column));
  const nuevas = [...actual].filter((column) => !COLUMNS.includes(column as (typeof COLUMNS)[number]));
  if (faltantes.length) throw new Error(`Faltan columnas en conteo: ${faltantes.join(", ")}`);
  if (nuevas.length) {
    throw new Error(
      `conteo tiene columnas nuevas que el CSV no archivaría: ${nuevas.join(", ")}. ` +
        `Añádelas a COLUMNS antes de continuar.`
    );
  }
}

/** Nadie debe seguir escribiendo en el servicio que se va a archivar. */
async function assertQuiescente(sql: Sql) {
  const [row] = await sql<{ max_ts: string | null; dias: number | null }[]>`
    SELECT MAX(ts) AS max_ts, EXTRACT(DAY FROM now() - MAX(ts))::int AS dias
    FROM conteo WHERE servicio_id = ${SERVICE_ID}
  `;
  if (!row?.max_ts) return;
  if ((row.dias ?? 0) < 7) {
    throw new Error(
      `El último conteo del servicio es de hace ${row.dias} días (${row.max_ts}): ` +
        `puede seguir ingiriendo. Se exige al menos 7 días de inactividad.`
    );
  }
}

/**
 * Censo por servicio. Se toma antes y después de cada fase: si cambia el conteo
 * de cualquier servicio que no sea Pelchuquín, algo salió del scope y se aborta.
 */
async function censoPorServicio(sql: Sql) {
  const rows = await sql<{ servicio_id: string; filas: string }[]>`
    SELECT servicio_id, COUNT(*)::text AS filas FROM conteo GROUP BY servicio_id
  `;
  return new Map(rows.map((row) => [row.servicio_id, Number(row.filas)]));
}

/**
 * Sólo una BAJADA en otro servicio es una fuga. Que un servicio ajeno crezca
 * durante la corrida es normal: `Planting Stock Pelú` está en curso y sigue
 * ingiriendo mientras esto se ejecuta. Lo que este script no puede hacer nunca
 * es quitarle filas a nadie más.
 */
function compararCenso(antes: Map<string, number>, despues: Map<string, number>) {
  const ids = new Set([...antes.keys(), ...despues.keys()]);
  const fugas: string[] = [];
  const crecimientos: string[] = [];
  for (const id of ids) {
    if (id === SERVICE_ID) continue;
    const a = antes.get(id) ?? 0;
    const d = despues.get(id) ?? 0;
    if (d < a) fugas.push(`${id}: ${a} → ${d} (perdió ${a - d})`);
    else if (d > a) crecimientos.push(`${id}: +${d - a}`);
  }
  if (fugas.length) {
    throw new Error(`Se perdieron conteos de servicios fuera del scope:\n  ${fugas.join("\n  ")}`);
  }
  if (crecimientos.length) {
    console.log(`  (servicios activos que crecieron durante la corrida: ${crecimientos.join(", ")})`);
  }
}

// ── Manifiesto ──────────────────────────────────────────────────────────────

async function readDias(sql: Sql) {
  return sql<{ dia: string; filas: string }[]>`
    SELECT (ts AT TIME ZONE 'UTC')::date::text AS dia, COUNT(*)::text AS filas
    FROM conteo
    WHERE servicio_id = ${SERVICE_ID}
    GROUP BY 1
    ORDER BY 1
  `;
}

type EntradaIndice = { dia: string; file_path: string; row_count: number; checksum: string | null };

async function readArchivados(sql: Sql) {
  const rows = await sql<EntradaIndice[]>`
    -- La columna date es timestamp, no date (la 0010 la creó como date y un
    -- db:push la convirtió), así que date::text daría '2026-05-07 00:00:00' y
    -- no casaría nunca con los días de readDias. to_char lo normaliza.
    SELECT to_char(date, 'YYYY-MM-DD') AS dia, file_path, row_count, checksum
    FROM conteo_archive_index
    WHERE servicio_id = ${SERVICE_ID}
    ORDER BY date, file_path
  `;
  const porDia = new Map<string, EntradaIndice[]>();
  for (const row of rows) {
    const lista: EntradaIndice[] = porDia.get(row.dia) ?? [];
    lista.push(row);
    porDia.set(row.dia, lista);
  }
  return porDia;
}

// ── Fase export ─────────────────────────────────────────────────────────────

/**
 * Vuelca un día a uno o más .csv.gz locales, en trozos de PART_ROWS filas.
 *
 * Streaming puro: el CSV nunca vive entero en memoria (ese es el bug que tumba
 * a la edge function con 1,4M filas/día). El troceado fijo mantiene cada objeto
 * muy por debajo del tope de 100 MB del bucket sin tener que adivinar el ratio
 * de compresión; el día más grande del servicio tiene 1,45M filas, o sea 4 partes.
 */
/**
 * Vuelca un trozo a un .csv.gz, con conexión propia y desechable.
 *
 * Compartiendo la conexión del resto del script, una corrida se colgó
 * indefinidamente entre dos partes: el servidor quedó idle y el cliente
 * esperando para siempre. El COPY en aislamiento funciona, así que era estado
 * de conexión de postgres.js; abrir y cerrar por trozo lo elimina de raíz.
 *
 * A cambio, la corrida abre más de cien conexiones y alguna se cae con
 * CONNECT_TIMEOUT, así que cada trozo se reintenta. El archivo parcial se
 * descarta entre intentos para no mezclar dos volcados.
 */
async function volcarParte(dia: string, parte: number, localPath: string) {
  let ultimo: Error | undefined;
  for (let intento = 1; intento <= 4; intento += 1) {
    const copySql = postgres(databaseUrl(), {
      prepare: false,
      max: 1,
      idle_timeout: 0,
      connect_timeout: 60,
    });
    try {
      await copySql`SET statement_timeout = 0`;
      // CRÍTICO para la fidelidad del archivo: `perimeter` es real (float4) y
      // la sesión trae extra_float_digits = 0, que imprime 6 cifras
      // significativas. Con eso, valores float4 distintos salen como el mismo
      // texto ('11.0388' llegaba a representar dos mediciones) y el CSV deja de
      // reconstruir el dato original. Con 3, la representación es exacta.
      await copySql`SET extra_float_digits = 3`;
      // El orden total sobre 9 columnas ya no lo sirve ningún índice, así que
      // cada trozo ordena el día entero (hasta 1,45M filas). Con el work_mem
      // por defecto eso se derrama a disco; 256MB lo mantiene en memoria.
      await copySql`SET work_mem = '256MB'`;
      // Sin parámetros: todos los valores interpolados son constantes del
      // script o el `dia` ya validado por quien llama.
      const copy = copySql.unsafe(`
        COPY (
          SELECT ${COLUMNS.join(", ")}
          FROM conteo
          WHERE servicio_id = '${SERVICE_ID}'
            AND ts >= '${dia} 00:00:00+00'::timestamptz
            AND ts <  '${dia} 00:00:00+00'::timestamptz + interval '1 day'
          -- Orden TOTAL sobre las 9 columnas, no sólo (ts, dispositivo_id).
          -- Un día multi-parte se lee con varias consultas independientes y
          -- LIMIT/OFFSET sólo es consistente entre ellas si el orden es
          -- determinista. Con (ts, dispositivo_id) no lo es: un día real tiene
          -- 399.620 filas empatadas en esa clave, así que el corte entre
          -- trozos podía duplicar una fila y perder otra. Las filas idénticas
          -- entre sí son intercambiables, luego este orden sí es total.
          ORDER BY ${COLUMNS.join(", ")}
          LIMIT ${PART_ROWS} OFFSET ${parte * PART_ROWS}
        ) TO STDOUT WITH (FORMAT csv, HEADER true)
      `);

      // Watchdog: si el volcado se vuelve a colgar, la corrida falla con un
      // error legible en vez de quedarse muda durante horas.
      await conVigilante(
        `COPY de ${dia} parte ${parte}`,
        COPY_TIMEOUT_MS,
        pipeline(await copy.readable(), createGzip(), createWriteStream(localPath))
      );
      return;
    } catch (error) {
      ultimo = error as Error;
      console.log(`    reintento ${intento} de ${dia} parte ${parte}: ${ultimo.message}`);
      await rm(localPath, { force: true });
      await new Promise((resolve) => setTimeout(resolve, intento * 5000));
    } finally {
      await copySql.end({ timeout: 5 }).catch(() => {});
    }
  }
  throw new Error(`No se pudo volcar ${dia} parte ${parte}: ${ultimo?.message}`);
}

async function volcarDia(dia: string): Promise<{ localPath: string; filas: number }[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error(`Día con formato inesperado: ${dia}`);

  const partes: { localPath: string; filas: number }[] = [];
  for (let parte = 0; ; parte += 1) {
    const localPath = join(OUT_DIR, `conteo-${dia}.part${String(parte).padStart(2, "0")}.csv.gz`);

    await volcarParte(dia, parte, localPath);

    const { filas } = await verificarArchivoLocal(localPath);
    const { size } = await stat(localPath);
    if (size > MAX_PART_BYTES) {
      throw new Error(
        `${localPath} pesa ${size} bytes (> ${MAX_PART_BYTES}, tope del bucket). Baja PART_ROWS.`
      );
    }
    if (filas > 0) partes.push({ localPath, filas });
    if (filas < PART_ROWS) break;
  }

  return partes;
}

/** Cuenta filas descomprimiendo (sin el header) y calcula el SHA-256 del .gz. */
async function verificarArchivoLocal(localPath: string) {
  let filas = 0;
  let resto = "";
  const gunzip = createReadStream(localPath).pipe(createGunzip());
  for await (const chunk of gunzip) {
    const texto = resto + chunk.toString("utf8");
    const lineas = texto.split("\n");
    resto = lineas.pop() ?? "";
    filas += lineas.length;
  }
  if (resto.length > 0) filas += 1;
  // La primera línea es el header.
  filas = Math.max(0, filas - 1);

  const hash = createHash("sha256");
  await pipeline(createReadStream(localPath), hash);
  return { filas, checksum: hash.digest("hex") };
}

/**
 * Cliente de Storage por REST, no con @supabase/supabase-js: `createClient`
 * levanta RealtimeClient, que en Node 20 revienta con "detected without native
 * WebSocket support". Aquí sólo se necesita subir y bajar objetos, así que
 * basta `fetch` con el service role.
 */
function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  const base = `${url.replace(/\/$/, "")}/storage/v1/object`;
  const headers = { Authorization: `Bearer ${key}`, apikey: key };

  /**
   * 57 días son cientos de peticiones y el proxy corta alguna: se ha visto un
   * 400 en HTML de nginx (no un error de Storage) que al reintentar pasa. Sin
   * reintento, un hipo de red aborta la corrida entera a mitad de camino.
   */
  async function conReintento(
    que: string,
    ejecutar: () => Promise<Response>,
    // Estados distintos de 2xx que también cuentan como respuesta final (p. ej.
    // un 404 al borrar: el objeto no estaba, que es justo lo que se quería).
    aceptar: number[] = []
  ) {
    let ultimo = "";
    for (let intento = 1; intento <= 4; intento += 1) {
      let response: Response;
      try {
        response = await ejecutar();
      } catch (error) {
        ultimo = `excepción de red: ${(error as Error).message}`;
        await new Promise((resolve) => setTimeout(resolve, intento * 2000));
        continue;
      }
      if (response.ok || aceptar.includes(response.status)) return response;
      const cuerpo = (await response.text()).slice(0, 300).replace(/\s+/g, " ");
      ultimo = `${response.status} ${cuerpo}`;
      // 4xx propios de Storage (duplicado, no encontrado, permisos) son
      // definitivos: reintentarlos sólo esconde el problema real.
      const transitorio = response.status >= 500 || !cuerpo.includes('"statusCode"');
      if (!transitorio) break;
      await new Promise((resolve) => setTimeout(resolve, intento * 2000));
    }
    throw new Error(`${que}: ${ultimo}`);
  }

  return {
    async upload(filePath: string, body: Buffer) {
      await conReintento(`Fallo al subir ${filePath}`, () =>
        fetch(`${base}/${BUCKET}/${filePath}`, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/gzip",
            // Sin upsert: si el objeto ya existe, falla en vez de pisarlo.
            "x-upsert": "false",
          },
          body: new Uint8Array(body),
        })
      );
    },
    async download(filePath: string) {
      const response = await conReintento(`No se pudo descargar ${filePath}`, () =>
        fetch(`${base}/${BUCKET}/${filePath}`, { headers })
      );
      return Buffer.from(await response.arrayBuffer());
    },
    /**
     * Borra un objeto que no está en `conteo_archive_index`, es decir el resto
     * de una corrida que murió entre la subida y el registro. El índice es la
     * fuente de verdad: sin fila ahí, el objeto no cuenta como archivado.
     */
    async removeHuerfano(filePath: string) {
      const response = await conReintento(
        `No se pudo limpiar el huérfano ${filePath}`,
        () => fetch(`${base}/${BUCKET}/${filePath}`, { method: "DELETE", headers }),
        [400, 404]
      );
      if (response.ok) return true;
      if (response.status === 404 || response.status === 400) return false;
      throw new Error(
        `No se pudo limpiar el huérfano ${filePath}: ${response.status} ${await response.text()}`
      );
    },
  };
}

async function faseExport(sql: Sql, apply: boolean) {
  await assertSchema(sql);
  await assertQuiescente(sql);

  const censoAntes = await censoPorServicio(sql);
  const dias = await readDias(sql);
  const yaArchivados = await readArchivados(sql);
  const totalFilas = dias.reduce((total, row) => total + Number(row.filas), 0);

  console.log(`${apply ? "APPLY" : "DRY-RUN"} export · ${SERVICE_NAME}`);
  console.log(`  ${dias.length} días · ${totalFilas.toLocaleString("es-CL")} filas`);
  console.log(`  ${yaArchivados.size} días ya registrados en conteo_archive_index (se saltan)`);
  console.log(`  destino: ${BUCKET}/servicio/${SERVICE_ID}/YYYY/MM/`);
  console.table(
    dias.slice(0, 10).map((row) => ({
      dia: row.dia,
      filas: Number(row.filas),
      estado: yaArchivados.has(row.dia) ? "archivado" : "pendiente",
      destino: objectPath(row.dia, 0, 1),
    }))
  );
  if (dias.length > 10) console.log(`  … y ${dias.length - 10} días más`);

  if (!apply) return;

  await mkdir(OUT_DIR, { recursive: true });
  const supabase = storageClient();
  const manifiesto: DiaManifiesto[] = [];

  for (const { dia, filas: filasEsperadasRaw } of dias) {
    const filasEsperadas = Number(filasEsperadasRaw);
    if (yaArchivados.has(dia)) {
      console.log(`  ${dia}: ya archivado, se salta`);
      continue;
    }

    const partesLocales = await volcarDia(dia);
    const filasCsv = partesLocales.reduce((total, parte) => total + parte.filas, 0);
    if (filasCsv !== filasEsperadas) {
      throw new Error(
        `${dia}: el CSV tiene ${filasCsv} filas y la base ${filasEsperadas}. Nada se sube.`
      );
    }

    const partes: DiaManifiesto["partes"] = [];
    for (const [indice, parte] of partesLocales.entries()) {
      const { checksum } = await verificarArchivoLocal(parte.localPath);
      const filePath = objectPath(dia, indice, partesLocales.length);
      const body = await readFile(parte.localPath);
      // Llegar aquí implica que el día NO está en el índice, así que cualquier
      // objeto en esta ruta es basura de una corrida anterior que murió a
      // medias. Se limpia para que el upload sin upsert no choque con un 409.
      if (await supabase.removeHuerfano(filePath)) {
        console.log(`    (se descartó un objeto huérfano previo en ${filePath})`);
      }
      await supabase.upload(filePath, body);
      partes.push({
        filePath,
        localPath: parte.localPath,
        bytes: body.byteLength,
        checksum,
        filas: parte.filas,
      });
    }

    // El índice se escribe sólo después de que todas las partes están arriba:
    // la fase delete se guía por él, así que una fila aquí significa
    // "archivado y verificado".
    await sql.begin(async (transaction) => {
      const tx = transaction as unknown as Sql;
      // La unicidad de la tabla es por objeto (un día se parte en varios
      // archivos), así que el "este día ya está" lo comprueba el script. Se
      // repite aquí, dentro de la transacción, para que dos corridas
      // simultáneas no dupliquen el día con rutas distintas.
      const [previo] = await tx<{ filas: string }[]>`
        SELECT COUNT(*)::text AS filas FROM conteo_archive_index
        WHERE servicio_id = ${SERVICE_ID} AND to_char(date, 'YYYY-MM-DD') = ${dia}
      `;
      if (Number(previo.filas) > 0) {
        throw new Error(`${dia}: ya tiene ${previo.filas} filas en el índice; no se duplica`);
      }
      for (const parte of partes) {
        await tx`
          INSERT INTO conteo_archive_index (date, servicio_id, file_path, row_count, checksum)
          VALUES (${dia}::date, ${SERVICE_ID}, ${parte.filePath}, ${parte.filas}, ${parte.checksum})
        `;
      }
    });

    manifiesto.push({ dia, filas: filasEsperadas, partes });
    console.log(
      `  ${dia}: ${filasEsperadas.toLocaleString("es-CL")} filas · ${partes.length} archivo(s) · ` +
        `${(partes.reduce((total, parte) => total + parte.bytes, 0) / 1024 / 1024).toFixed(1)} MB`
    );
  }

  await writeFile(
    join(OUT_DIR, "manifest.json"),
    JSON.stringify({ servicioId: SERVICE_ID, servicio: SERVICE_NAME, totalFilas, dias: manifiesto }, null, 2)
  );

  // El export es sólo lectura sobre conteo: ningún servicio debe haber cambiado.
  compararCenso(censoAntes, await censoPorServicio(sql));
  console.log(`Export listo. Manifiesto en ${join(OUT_DIR, "manifest.json")}`);
}

// ── Fase delete ─────────────────────────────────────────────────────────────

/**
 * Prueba de restauración real de un día, la única que autoriza el borrado.
 *
 * El checksum sólo demuestra que el objeto no se corrompió en Storage; no
 * demuestra que su contenido reconstruya los datos. Esa diferencia importó:
 * una versión anterior de este script exportaba `perimeter` con
 * extra_float_digits = 0 y el CSV, con checksum perfecto, no reproducía los
 * valores float4 originales.
 *
 * Así que se descarga el día, se carga en una tabla temporal con el mismo
 * esquema que `conteo` y se exige que el EXCEPT ALL sea vacío en los dos
 * sentidos: ni una fila de más ni una de menos, columna por columna.
 */
async function verificarRestauracion(
  supabase: ReturnType<typeof storageClient>,
  entradas: EntradaIndice[],
  dia: string,
  // `true` exige identidad exacta en ambos sentidos (día intacto). `false` sólo
  // exige que el archivo CUBRA lo que queda en la base, que es el caso de un
  // día a medio borrar por una corrida anterior interrumpida.
  estricto = true
) {
  // Cada día es independiente y esta comprobación sólo lee (la tabla temporal
  // muere con la conexión), así que un fallo de red se reintenta a nivel de
  // día. Un fallo de DATOS no: ese debe cortar la corrida en el acto.
  let ultimo: Error | undefined;
  for (let intento = 1; intento <= 4; intento += 1) {
    try {
      await verificarRestauracionUnaVez(supabase, entradas, dia, estricto);
      return;
    } catch (error) {
      const mensaje = (error as Error).message;
      if (mensaje.includes("no reconstruye") || mensaje.includes("Checksum distinto")) throw error;
      ultimo = error as Error;
      console.log(`    reintento ${intento} de la verificación de ${dia}: ${mensaje}`);
      await new Promise((resolve) => setTimeout(resolve, intento * 5000));
    }
  }
  throw new Error(`No se pudo verificar ${dia}: ${ultimo?.message}`);
}

async function verificarRestauracionUnaVez(
  supabase: ReturnType<typeof storageClient>,
  entradas: EntradaIndice[],
  dia: string,
  estricto: boolean
) {
  const verifySql = postgres(databaseUrl(), {
    prepare: false,
    max: 1,
    idle_timeout: 0,
    connect_timeout: 60,
  });
  try {
    await verifySql`SET statement_timeout = 0`;
    await verifySql`CREATE TEMP TABLE restaurado (LIKE conteo)`;

    for (const entrada of entradas) {
      const bytes = await supabase.download(entrada.file_path);
      const checksum = createHash("sha256").update(bytes).digest("hex");
      if (entrada.checksum && checksum !== entrada.checksum) {
        throw new Error(
          `Checksum distinto en ${entrada.file_path}: Storage ${checksum}, índice ${entrada.checksum}`
        );
      }
      const escritura = await verifySql`
        COPY restaurado (${verifySql.unsafe(COLUMNS.join(", "))})
        FROM STDIN WITH (FORMAT csv, HEADER true)
      `.writable();
      await pipeline(Readable.from([gunzipSync(bytes)]), escritura);
    }

    const [comparacion] = await verifySql<{ solo_db: number; solo_csv: number }[]>`
      WITH original AS (
        SELECT * FROM conteo
        WHERE servicio_id = ${SERVICE_ID}
          AND ts >= ${`${dia} 00:00:00+00`}::timestamptz
          AND ts <  ${`${dia} 00:00:00+00`}::timestamptz + interval '1 day'
      )
      SELECT
        (SELECT COUNT(*) FROM (SELECT * FROM original EXCEPT ALL SELECT * FROM restaurado) t)::int AS solo_db,
        (SELECT COUNT(*) FROM (SELECT * FROM restaurado EXCEPT ALL SELECT * FROM original) t)::int AS solo_csv
    `;
    // `solo_db > 0` es SIEMPRE fatal: habría filas vivas que el archivo no
    // contiene, o sea que borrarlas las perdería para siempre.
    if (comparacion.solo_db !== 0) {
      throw new Error(
        `${dia}: el archivo no reconstruye los datos — ${comparacion.solo_db} filas están en la base ` +
          `y no en el CSV. No se borra nada.`
      );
    }
    // `solo_csv > 0` sólo es fatal en un día intacto. En uno a medio borrar es
    // justo lo esperado: el archivo conserva las filas que ya se eliminaron.
    if (estricto && comparacion.solo_csv !== 0) {
      throw new Error(
        `${dia}: el archivo no reconstruye los datos — ${comparacion.solo_csv} filas están en el CSV ` +
          `y no en la base. No se borra nada.`
      );
    }
  } finally {
    await verifySql.end({ timeout: 5 }).catch(() => {});
  }
}

async function faseDelete(sql: Sql, apply: boolean) {
  await assertQuiescente(sql);

  const censoAntes = await censoPorServicio(sql);
  const enConteo = censoAntes.get(SERVICE_ID) ?? 0;
  const dias = await readDias(sql);
  const archivados = await readArchivados(sql);

  const filasArchivadas = [...archivados.values()]
    .flat()
    .reduce((total, entrada) => total + entrada.row_count, 0);
  const sinArchivar = dias.filter((row) => !archivados.has(row.dia));

  console.log(`${apply ? "APPLY" : "DRY-RUN"} delete · ${SERVICE_NAME}`);
  console.log(`  en conteo:   ${enConteo.toLocaleString("es-CL")} filas`);
  console.log(`  archivadas:  ${filasArchivadas.toLocaleString("es-CL")} filas en ${archivados.size} días`);

  if (sinArchivar.length) {
    throw new Error(
      `Hay ${sinArchivar.length} días sin archivar (ej. ${sinArchivar[0].dia}). ` +
        `Corre la fase export antes de borrar.`
    );
  }

  // La invariante se comprueba POR DÍA, no sobre el total. Comparar
  // `filasArchivadas` contra el total de `conteo` haría irreanudable la fase:
  // tras un borrado parcial el índice seguiría cubriendo los 57 días mientras
  // que `conteo` ya tendría menos filas, y el script se bloquearía a sí mismo.
  // Sólo importa que cada día que AÚN está en `conteo` esté archivado entero.
  const estadoDias = dias.map(({ dia, filas }) => {
    const archivado = (archivados.get(dia) ?? []).reduce((t, e) => t + e.row_count, 0);
    return { dia, enDb: Number(filas), archivado };
  });
  // Sólo `enDb > archivado` es un error: significaría que hay filas vivas que
  // el archivo no cubre. `enDb < archivado` es un día a medio borrar por una
  // corrida interrumpida, y ahí el archivo simplemente conserva de más.
  const descubiertos = estadoDias.filter((d) => d.enDb > d.archivado);
  if (descubiertos.length) {
    throw new Error(
      `Días con filas que el archivo no cubre:\n  ` +
        descubiertos.map((d) => `${d.dia}: conteo ${d.enDb} vs archivo ${d.archivado}`).join("\n  ")
    );
  }
  const aMedias = estadoDias.filter((d) => d.enDb < d.archivado);
  if (aMedias.length) {
    console.log(
      `  (reanudando: ${aMedias.length} día(s) a medio borrar, p. ej. ${aMedias[0].dia} ` +
        `con ${aMedias[0].enDb} de ${aMedias[0].archivado} filas)`
    );
  }
  if (dias.length < archivados.size) {
    console.log(
      `  (reanudando: ${archivados.size - dias.length} días ya fueron borrados en una corrida previa)`
    );
  }

  const guardado = await sql<{ filas: string }[]>`
    SELECT COUNT(*)::text AS filas FROM conteo c
    JOIN perimeter_recal_runs r
      ON r.servicio_id = c.servicio_id AND r.dispositivo_id = c.dispositivo_id AND c.ts < r.cutoff_ts
    WHERE c.servicio_id = ${SERVICE_ID}
      AND r.status IN ('preparing','prepared','applying','applied','validated','rolling_back')
  `;
  console.log(
    `  bajo guard de recalibración: ${Number(guardado[0].filas).toLocaleString("es-CL")} filas ` +
      `(se borran declarando repair_id="${REPAIR_ID}")`
  );

  if (!apply) {
    console.log("  Dry-run: no se borró nada.");
    return;
  }

  const supabase = storageClient();
  let borradas = 0;

  for (const { dia, enDb, archivado } of estadoDias) {
    // Restauración real del día contra la base antes de tocar una sola fila.
    // Si el archivo no cubre lo que hay vivo, esto lanza y no se borra nada.
    // Un día a medio borrar se verifica en modo no estricto (ver la función).
    await verificarRestauracion(supabase, archivados.get(dia) ?? [], dia, enDb === archivado);

    let delDia = 0;
    while (true) {
      const afectadas = await sql.begin(async (transaction) => {
        const tx = transaction as unknown as Sql;
        // El guard lee este GUC con current_setting(..., true); `true` en
        // set_config lo hace local a la transacción.
        await tx`SELECT set_config('stass.perimeter_repair_id', ${REPAIR_ID}, true)`;
        const result = await tx`
          DELETE FROM conteo
          WHERE ctid IN (
            SELECT ctid FROM conteo
            WHERE servicio_id = ${SERVICE_ID}
              AND ts >= ${`${dia} 00:00:00+00`}::timestamptz
              AND ts <  ${`${dia} 00:00:00+00`}::timestamptz + interval '1 day'
            LIMIT ${DELETE_BATCH}
          )
        `;
        return result.count;
      });
      if (afectadas === 0) break;
      delDia += afectadas;
      borradas += afectadas;
    }
    console.log(`  ${dia}: ${delDia.toLocaleString("es-CL")} filas borradas`);
  }

  const censoDespues = await censoPorServicio(sql);
  compararCenso(censoAntes, censoDespues);
  const restantes = censoDespues.get(SERVICE_ID) ?? 0;
  if (restantes !== 0) throw new Error(`Quedaron ${restantes} filas del servicio en conteo`);
  if (borradas !== enConteo) {
    throw new Error(`Se borraron ${borradas} filas y se esperaban ${enConteo}`);
  }

  console.log(`  ${borradas.toLocaleString("es-CL")} filas borradas. VACUUM (ANALYZE) conteo…`);
  // VACUUM normal: marca el espacio como reutilizable pero no lo devuelve al
  // SO. Recuperar disco requeriría VACUUM FULL (lock exclusivo + 18 GB libres).
  await sql`VACUUM (ANALYZE) conteo`;
  console.log("Listo.");
}

// ── Fase verificar ──────────────────────────────────────────────────────────

/**
 * Restaura los 57 días contra la base sin borrar nada. Es la misma prueba que
 * hace `delete` antes de cada día, pero completa y por adelantado: si un día no
 * reconstruye exacto, se sabe ahora y no a mitad del borrado.
 */
async function faseVerificar(sql: Sql) {
  const censoAntes = await censoPorServicio(sql);
  const dias = await readDias(sql);
  const archivados = await readArchivados(sql);
  const supabase = storageClient();

  const sinArchivar = dias.filter((row) => !archivados.has(row.dia));
  console.log(`VERIFICAR · ${SERVICE_NAME}`);
  console.log(`  ${dias.length} días en conteo · ${archivados.size} días archivados`);
  if (sinArchivar.length) {
    throw new Error(`Hay ${sinArchivar.length} días sin archivar (ej. ${sinArchivar[0].dia})`);
  }

  let filas = 0;
  for (const { dia, filas: filasDia } of dias) {
    const entradas = archivados.get(dia) ?? [];
    await verificarRestauracion(supabase, entradas, dia);
    filas += Number(filasDia);
    console.log(
      `  ${dia}: ${Number(filasDia).toLocaleString("es-CL")} filas · ${entradas.length} archivo(s) · restaura exacto`
    );
  }

  compararCenso(censoAntes, await censoPorServicio(sql));
  console.log(
    `\nTodos los días reconstruyen exacto: ${filas.toLocaleString("es-CL")} filas en ${dias.length} días.`
  );
}

// ── Entrada ─────────────────────────────────────────────────────────────────

async function main() {
  const fase = argValue("--fase");
  if (fase !== "export" && fase !== "verificar" && fase !== "delete") {
    throw new Error("Usa --fase export | verificar | delete");
  }
  const apply = hasFlag("--apply");
  if (apply && !hasFlag("--yes")) throw new Error("Para aplicar debes usar --apply --yes");

  // Esta conexión lleva metadatos, índice y borrado; cada COPY abre la suya.
  const sql = postgres(databaseUrl(), {
    prepare: false,
    max: 1,
    idle_timeout: 0,
    connect_timeout: 30,
  });

  try {
    // Sin esto, los COUNT sobre 31M filas mueren por statement_timeout.
    await sql`SET statement_timeout = 0`;
    await readService(sql);
    if (fase === "export") await faseExport(sql, apply);
    else if (fase === "verificar") await faseVerificar(sql);
    else await faseDelete(sql, apply);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
