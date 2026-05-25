import { config } from "dotenv";
import { readFileSync } from "fs";
import postgres from "postgres";

config({ path: ".env.local" });

type Sql = postgres.Sql<Record<string, unknown>>;

interface RepairFile {
  reason?: string;
  windows?: unknown;
}

interface RepairWindow {
  servicioId: string;
  dispositivoId: string;
  loteId: string;
  startTs: Date;
  endTs: Date;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function usage(): never {
  console.error(`
Uso:
  npm run repair:lote-session -- --input scripts/repair-lote-session.example.json
  npm run repair:lote-session -- --input repair.json --apply --yes

Por defecto corre en dry-run. Para mutar datos exige --apply --yes.
`);
  process.exit(1);
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function parseDate(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} debe ser un string ISO`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} no es una fecha valida: ${value}`);
  }
  return date;
}

function parseUuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new Error(`${label} debe ser UUID valido`);
  }
  return value;
}

function loadWindows(path: string): RepairWindow[] {
  const payload = JSON.parse(readFileSync(path, "utf8")) as RepairFile;
  if (!Array.isArray(payload.windows) || payload.windows.length === 0) {
    throw new Error("El archivo debe incluir windows[] con al menos una ventana");
  }

  return payload.windows.map((raw, index) => {
    if (typeof raw !== "object" || raw === null) {
      throw new Error(`windows[${index}] debe ser un objeto`);
    }
    const row = raw as Record<string, unknown>;
    const startTs = parseDate(row.startTs, `windows[${index}].startTs`);
    const endTs = parseDate(row.endTs, `windows[${index}].endTs`);
    if (startTs >= endTs) {
      throw new Error(`windows[${index}] debe tener startTs < endTs`);
    }

    return {
      servicioId: parseUuid(row.servicioId, `windows[${index}].servicioId`),
      dispositivoId: parseUuid(row.dispositivoId, `windows[${index}].dispositivoId`),
      loteId: parseUuid(row.loteId, `windows[${index}].loteId`),
      startTs,
      endTs,
    };
  });
}

async function createTempTables(sql: Sql) {
  await sql`
    CREATE TEMP TABLE repair_windows (
      servicio_id uuid NOT NULL,
      dispositivo_id uuid NOT NULL,
      lote_id uuid NOT NULL,
      start_ts timestamptz NOT NULL,
      end_ts timestamptz NOT NULL
    ) ON COMMIT DROP
  `;

  await sql`
    CREATE TEMP TABLE repair_moved_counts (
      old_lote_id uuid NOT NULL,
      new_lote_id uuid NOT NULL,
      servicio_id uuid NOT NULL,
      dispositivo_id uuid NOT NULL,
      moved_count integer NOT NULL
    ) ON COMMIT DROP
  `;
}

async function insertWindows(sql: Sql, windows: RepairWindow[]) {
  for (const window of windows) {
    await sql`
      INSERT INTO repair_windows (
        servicio_id,
        dispositivo_id,
        lote_id,
        start_ts,
        end_ts
      )
      VALUES (
        ${window.servicioId},
        ${window.dispositivoId},
        ${window.loteId},
        ${window.startTs},
        ${window.endTs}
      )
    `;
  }

  await sql`
    CREATE TEMP TABLE repair_bounds ON COMMIT DROP AS
    SELECT
      servicio_id,
      dispositivo_id,
      MIN(start_ts) AS first_start,
      MAX(end_ts) AS last_end
    FROM repair_windows
    GROUP BY servicio_id, dispositivo_id
  `;

  await sql`
    CREATE TEMP TABLE repair_affected_scope ON COMMIT DROP AS
    SELECT DISTINCT
      rw.lote_id,
      rw.servicio_id,
      rw.dispositivo_id
    FROM repair_windows rw
    UNION
    SELECT DISTINCT
      c.lote_id,
      rw.servicio_id,
      rw.dispositivo_id
    FROM conteo c
    JOIN repair_windows rw
      ON c.servicio_id = rw.servicio_id
     AND c.dispositivo_id = rw.dispositivo_id
     AND c.ts >= rw.start_ts
     AND c.ts < rw.end_ts
  `;
}

async function preflight(sql: Sql) {
  const serviceCount = await sql<{ count: number }[]>`
    SELECT COUNT(DISTINCT servicio_id)::int AS count
    FROM repair_windows
  `;
  if (serviceCount[0].count !== 1) {
    throw new Error(
      `La reparacion debe ejecutarse para un servicio a la vez. Servicios detectados: ${serviceCount[0].count}`
    );
  }

  const overlaps = await sql`
    SELECT
      a.dispositivo_id,
      a.lote_id AS lote_id_a,
      a.start_ts AS start_a,
      a.end_ts AS end_a,
      b.lote_id AS lote_id_b,
      b.start_ts AS start_b,
      b.end_ts AS end_b
    FROM repair_windows a
    JOIN repair_windows b
      ON a.dispositivo_id = b.dispositivo_id
     AND a.start_ts < b.end_ts
     AND b.start_ts < a.end_ts
     AND (a.lote_id, a.start_ts, a.end_ts) < (b.lote_id, b.start_ts, b.end_ts)
    ORDER BY a.dispositivo_id, a.start_ts
  `;
  if (overlaps.length > 0) {
    console.table(overlaps);
    throw new Error("Las ventanas de reparacion se solapan por dispositivo");
  }

  const missingAssignments = await sql`
    SELECT rw.*
    FROM repair_windows rw
    LEFT JOIN lote_servicio ls
      ON ls.lote_id = rw.lote_id
     AND ls.servicio_id = rw.servicio_id
    WHERE ls.lote_id IS NULL
    ORDER BY rw.dispositivo_id, rw.start_ts
  `;
  if (missingAssignments.length > 0) {
    console.table(missingAssignments);
    throw new Error("Hay lotes no asignados al servicio indicado");
  }

  const sessionBlockers = await sql`
    SELECT
      ls.id,
      ls.lote_id,
      ls.dispositivo_id,
      ls.start_time,
      ls.end_time
    FROM lote_session ls
    JOIN lote_servicio lsv
      ON lsv.lote_id = ls.lote_id
    JOIN repair_bounds rb
      ON rb.servicio_id = lsv.servicio_id
     AND rb.dispositivo_id = ls.dispositivo_id
    WHERE ls.start_time >= rb.first_start
      AND ls.start_time < rb.last_end
      AND NOT EXISTS (
        SELECT 1
        FROM repair_windows rw
        WHERE rw.dispositivo_id = ls.dispositivo_id
          AND rw.lote_id = ls.lote_id
          AND rw.start_ts = ls.start_time
          AND rw.end_ts IS NOT DISTINCT FROM ls.end_time
      )
    ORDER BY ls.dispositivo_id, ls.start_time
  `;
  if (sessionBlockers.length > 0) {
    console.table(sessionBlockers);
    throw new Error(
      "Existen lote_session dentro del rango afectado que no calzan con las ventanas de reparacion"
    );
  }

  const movingCounts = await sql`
    SELECT
      c.lote_id AS old_lote_id,
      rw.lote_id AS new_lote_id,
      rw.servicio_id,
      rw.dispositivo_id,
      COUNT(*)::int AS moved_count,
      MIN(c.ts) AS first_ts,
      MAX(c.ts) AS last_ts
    FROM conteo c
    JOIN repair_windows rw
      ON c.servicio_id = rw.servicio_id
     AND c.dispositivo_id = rw.dispositivo_id
     AND c.ts >= rw.start_ts
     AND c.ts < rw.end_ts
    WHERE c.lote_id <> rw.lote_id
    GROUP BY c.lote_id, rw.lote_id, rw.servicio_id, rw.dispositivo_id
    ORDER BY rw.dispositivo_id, first_ts, old_lote_id, new_lote_id
  `;

  const unchangedCounts = await sql`
    SELECT
      rw.lote_id,
      rw.servicio_id,
      rw.dispositivo_id,
      COUNT(*)::int AS already_correct_count
    FROM conteo c
    JOIN repair_windows rw
      ON c.servicio_id = rw.servicio_id
     AND c.dispositivo_id = rw.dispositivo_id
     AND c.ts >= rw.start_ts
     AND c.ts < rw.end_ts
    WHERE c.lote_id = rw.lote_id
    GROUP BY rw.lote_id, rw.servicio_id, rw.dispositivo_id
    ORDER BY rw.dispositivo_id, rw.lote_id
  `;

  const gaps = await sql`
    WITH ordered AS (
      SELECT
        dispositivo_id,
        start_ts,
        end_ts,
        LAG(end_ts) OVER (
          PARTITION BY dispositivo_id
          ORDER BY start_ts
        ) AS previous_end_ts
      FROM repair_windows
    )
    SELECT *
    FROM ordered
    WHERE previous_end_ts IS NOT NULL
      AND previous_end_ts <> start_ts
    ORDER BY dispositivo_id, start_ts
  `;

  console.log("\nPreflight: conteos que cambiarian de lote");
  console.table(movingCounts);
  console.log("Preflight: conteos que ya estaban en el lote correcto");
  console.table(unchangedCounts);
  if (gaps.length > 0) {
    console.log("Preflight: ventanas no contiguas entre si (informativo)");
    console.table(gaps);
  }
}

async function applyRepair(sql: Sql) {
  await sql`SELECT pg_advisory_xact_lock(hashtext('repair_lote_session'))`;

  const closedSessions = await sql`
    UPDATE lote_session ls
    SET end_time = rb.first_start
    FROM repair_bounds rb
    WHERE ls.dispositivo_id = rb.dispositivo_id
      AND ls.start_time < rb.first_start
      AND (ls.end_time IS NULL OR ls.end_time > rb.first_start)
      AND EXISTS (
        SELECT 1
        FROM lote_servicio lsv
        WHERE lsv.lote_id = ls.lote_id
          AND lsv.servicio_id = rb.servicio_id
      )
    RETURNING
      ls.id,
      ls.lote_id,
      ls.dispositivo_id,
      ls.start_time,
      ls.end_time
  `;

  const insertedSessions = await sql`
    INSERT INTO lote_session (
      lote_id,
      dispositivo_id,
      start_time,
      end_time
    )
    SELECT
      rw.lote_id,
      rw.dispositivo_id,
      rw.start_ts,
      rw.end_ts
    FROM repair_windows rw
    WHERE NOT EXISTS (
      SELECT 1
      FROM lote_session ls
      WHERE ls.lote_id = rw.lote_id
        AND ls.dispositivo_id = rw.dispositivo_id
        AND ls.start_time = rw.start_ts
        AND ls.end_time IS NOT DISTINCT FROM rw.end_ts
    )
    RETURNING id, lote_id, dispositivo_id, start_time, end_time
  `;

  await sql`
    INSERT INTO repair_moved_counts (
      old_lote_id,
      new_lote_id,
      servicio_id,
      dispositivo_id,
      moved_count
    )
    SELECT
      c.lote_id,
      rw.lote_id,
      rw.servicio_id,
      rw.dispositivo_id,
      COUNT(*)::int
    FROM conteo c
    JOIN repair_windows rw
      ON c.servicio_id = rw.servicio_id
     AND c.dispositivo_id = rw.dispositivo_id
     AND c.ts >= rw.start_ts
     AND c.ts < rw.end_ts
    WHERE c.lote_id <> rw.lote_id
    GROUP BY c.lote_id, rw.lote_id, rw.servicio_id, rw.dispositivo_id
  `;

  const updatedConteo = await sql`
    WITH candidates AS (
      SELECT
        c.ctid AS row_id,
        rw.lote_id AS new_lote_id
      FROM conteo c
      JOIN repair_windows rw
        ON c.servicio_id = rw.servicio_id
       AND c.dispositivo_id = rw.dispositivo_id
       AND c.ts >= rw.start_ts
       AND c.ts < rw.end_ts
      WHERE c.lote_id <> rw.lote_id
    )
    UPDATE conteo c
    SET lote_id = candidates.new_lote_id
    FROM candidates
    WHERE c.ctid = candidates.row_id
    RETURNING c.lote_id
  `;

  await sql`
    DELETE FROM lote_stats ls
    USING repair_affected_scope scope
    WHERE ls.lote_id = scope.lote_id
      AND ls.servicio_id = scope.servicio_id
      AND ls.dispositivo_id = scope.dispositivo_id
  `;

  await sql`
    DELETE FROM lote_total_stats lts
    USING repair_affected_scope scope
    WHERE lts.lote_id = scope.lote_id
      AND lts.servicio_id = scope.servicio_id
      AND lts.dispositivo_id = scope.dispositivo_id
  `;

  await sql`
    INSERT INTO lote_total_stats (
      lote_id,
      servicio_id,
      dispositivo_id,
      count_in,
      count_out,
      first_ts,
      last_ts
    )
    SELECT
      c.lote_id,
      c.servicio_id,
      c.dispositivo_id,
      SUM(CASE WHEN c.direction = 0 THEN 1 ELSE 0 END)::int,
      SUM(CASE WHEN c.direction = 1 THEN 1 ELSE 0 END)::int,
      MIN(c.ts),
      MAX(c.ts)
    FROM conteo c
    JOIN repair_affected_scope scope
      ON scope.lote_id = c.lote_id
     AND scope.servicio_id = c.servicio_id
     AND scope.dispositivo_id = c.dispositivo_id
    GROUP BY c.lote_id, c.servicio_id, c.dispositivo_id
    ON CONFLICT (lote_id, servicio_id, dispositivo_id) DO UPDATE SET
      count_in = EXCLUDED.count_in,
      count_out = EXCLUDED.count_out,
      first_ts = EXCLUDED.first_ts,
      last_ts = EXCLUDED.last_ts
  `;

  await sql`
    INSERT INTO lote_stats (
      lote_id,
      servicio_id,
      dispositivo_id,
      calibre,
      count_in,
      count_out,
      first_ts,
      last_ts
    )
    SELECT
      c.lote_id,
      c.servicio_id,
      c.dispositivo_id,
      ROUND(c.perimeter::numeric, 1)::real,
      SUM(CASE WHEN c.direction = 0 THEN 1 ELSE 0 END)::int,
      SUM(CASE WHEN c.direction = 1 THEN 1 ELSE 0 END)::int,
      MIN(c.ts),
      MAX(c.ts)
    FROM conteo c
    JOIN repair_affected_scope scope
      ON scope.lote_id = c.lote_id
     AND scope.servicio_id = c.servicio_id
     AND scope.dispositivo_id = c.dispositivo_id
    WHERE c.perimeter IS NOT NULL
    GROUP BY
      c.lote_id,
      c.servicio_id,
      c.dispositivo_id,
      ROUND(c.perimeter::numeric, 1)::real
    ON CONFLICT (lote_id, servicio_id, dispositivo_id, calibre) DO UPDATE SET
      count_in = EXCLUDED.count_in,
      count_out = EXCLUDED.count_out,
      first_ts = EXCLUDED.first_ts,
      last_ts = EXCLUDED.last_ts
  `;

  const movedCounts = await sql`
    SELECT *
    FROM repair_moved_counts
    ORDER BY dispositivo_id, old_lote_id, new_lote_id
  `;

  console.log("\nAplicacion: sesiones cerradas en el inicio del tramo");
  console.table(closedSessions);
  console.log("Aplicacion: sesiones historicas insertadas");
  console.table(insertedSessions);
  console.log(`Aplicacion: conteos actualizados: ${updatedConteo.length}`);
  console.table(movedCounts);
}

async function validateRepair(sql: Sql) {
  const totalMismatches = await sql`
    WITH expected AS (
      SELECT
        c.lote_id,
        c.servicio_id,
        c.dispositivo_id,
        SUM(CASE WHEN c.direction = 0 THEN 1 ELSE 0 END)::int AS count_in,
        SUM(CASE WHEN c.direction = 1 THEN 1 ELSE 0 END)::int AS count_out,
        MIN(c.ts) AS first_ts,
        MAX(c.ts) AS last_ts
      FROM conteo c
      JOIN repair_affected_scope scope
        ON scope.lote_id = c.lote_id
       AND scope.servicio_id = c.servicio_id
       AND scope.dispositivo_id = c.dispositivo_id
      GROUP BY c.lote_id, c.servicio_id, c.dispositivo_id
    )
    SELECT
      COALESCE(e.lote_id, lts.lote_id) AS lote_id,
      COALESCE(e.servicio_id, lts.servicio_id) AS servicio_id,
      COALESCE(e.dispositivo_id, lts.dispositivo_id) AS dispositivo_id,
      e.count_in AS expected_in,
      lts.count_in AS actual_in,
      e.count_out AS expected_out,
      lts.count_out AS actual_out,
      e.first_ts AS expected_first_ts,
      lts.first_ts AS actual_first_ts,
      e.last_ts AS expected_last_ts,
      lts.last_ts AS actual_last_ts
    FROM expected e
    FULL OUTER JOIN lote_total_stats lts
      ON lts.lote_id = e.lote_id
     AND lts.servicio_id = e.servicio_id
     AND lts.dispositivo_id = e.dispositivo_id
    JOIN repair_affected_scope scope
      ON scope.lote_id = COALESCE(e.lote_id, lts.lote_id)
     AND scope.servicio_id = COALESCE(e.servicio_id, lts.servicio_id)
     AND scope.dispositivo_id = COALESCE(e.dispositivo_id, lts.dispositivo_id)
    WHERE e.count_in IS DISTINCT FROM lts.count_in
       OR e.count_out IS DISTINCT FROM lts.count_out
       OR e.first_ts IS DISTINCT FROM lts.first_ts
       OR e.last_ts IS DISTINCT FROM lts.last_ts
  `;

  const distributionMismatches = await sql`
    WITH expected AS (
      SELECT
        c.lote_id,
        c.servicio_id,
        c.dispositivo_id,
        ROUND(c.perimeter::numeric, 1)::real AS calibre,
        SUM(CASE WHEN c.direction = 0 THEN 1 ELSE 0 END)::int AS count_in,
        SUM(CASE WHEN c.direction = 1 THEN 1 ELSE 0 END)::int AS count_out,
        MIN(c.ts) AS first_ts,
        MAX(c.ts) AS last_ts
      FROM conteo c
      JOIN repair_affected_scope scope
        ON scope.lote_id = c.lote_id
       AND scope.servicio_id = c.servicio_id
       AND scope.dispositivo_id = c.dispositivo_id
      WHERE c.perimeter IS NOT NULL
      GROUP BY
        c.lote_id,
        c.servicio_id,
        c.dispositivo_id,
        ROUND(c.perimeter::numeric, 1)::real
    )
    SELECT
      COALESCE(e.lote_id, ls.lote_id) AS lote_id,
      COALESCE(e.servicio_id, ls.servicio_id) AS servicio_id,
      COALESCE(e.dispositivo_id, ls.dispositivo_id) AS dispositivo_id,
      COALESCE(e.calibre, ls.calibre) AS calibre,
      e.count_in AS expected_in,
      ls.count_in AS actual_in,
      e.count_out AS expected_out,
      ls.count_out AS actual_out
    FROM expected e
    FULL OUTER JOIN lote_stats ls
      ON ls.lote_id = e.lote_id
     AND ls.servicio_id = e.servicio_id
     AND ls.dispositivo_id = e.dispositivo_id
     AND ls.calibre = e.calibre
    JOIN repair_affected_scope scope
      ON scope.lote_id = COALESCE(e.lote_id, ls.lote_id)
     AND scope.servicio_id = COALESCE(e.servicio_id, ls.servicio_id)
     AND scope.dispositivo_id = COALESCE(e.dispositivo_id, ls.dispositivo_id)
    WHERE e.count_in IS DISTINCT FROM ls.count_in
       OR e.count_out IS DISTINCT FROM ls.count_out
       OR e.first_ts IS DISTINCT FROM ls.first_ts
       OR e.last_ts IS DISTINCT FROM ls.last_ts
  `;

  const duplicateOpenSessions = await sql`
    SELECT
      ls.dispositivo_id,
      COUNT(*)::int AS open_session_count
    FROM lote_session ls
    WHERE ls.dispositivo_id IN (
      SELECT DISTINCT dispositivo_id
      FROM repair_windows
    )
      AND ls.end_time IS NULL
    GROUP BY ls.dispositivo_id
    HAVING COUNT(*) > 1
  `;

  const missingInsertedSessions = await sql`
    SELECT rw.*
    FROM repair_windows rw
    WHERE NOT EXISTS (
      SELECT 1
      FROM lote_session ls
      WHERE ls.lote_id = rw.lote_id
        AND ls.dispositivo_id = rw.dispositivo_id
        AND ls.start_time = rw.start_ts
        AND ls.end_time IS NOT DISTINCT FROM rw.end_ts
    )
  `;

  if (totalMismatches.length > 0) {
    console.table(totalMismatches);
    throw new Error("Validacion fallo: lote_total_stats no cuadra con conteo");
  }
  if (distributionMismatches.length > 0) {
    console.table(distributionMismatches);
    throw new Error("Validacion fallo: lote_stats no cuadra con conteo");
  }
  if (duplicateOpenSessions.length > 0) {
    console.table(duplicateOpenSessions);
    throw new Error("Validacion fallo: hay mas de una lote_session abierta por dispositivo");
  }
  if (missingInsertedSessions.length > 0) {
    console.table(missingInsertedSessions);
    throw new Error("Validacion fallo: faltan sesiones historicas esperadas");
  }

  console.log("\nValidacion OK: stats reconstruidos y sesiones consistentes.");
}

async function main() {
  const inputPath = readArg("--input");
  if (!inputPath) usage();

  const apply = hasFlag("--apply");
  const yes = hasFlag("--yes");
  if (apply && !yes) {
    throw new Error("Para aplicar cambios debes pasar --apply --yes");
  }

  const connectionString =
    process.env.DATABASE_URL_POOLER ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL_POOLER o DATABASE_URL");
  }

  const windows = loadWindows(inputPath);
  console.log(
    `${apply ? "APPLY" : "DRY-RUN"} repair:lote-session - ventanas: ${windows.length}`
  );

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  try {
    await sql.begin(async (tx) => {
      const repairTx = tx as unknown as Sql;
      await createTempTables(repairTx);
      await insertWindows(repairTx, windows);
      await preflight(repairTx);

      if (!apply) {
        console.log("\nDry-run completo. No se modificaron datos permanentes.");
        return;
      }

      await applyRepair(repairTx);
      await validateRepair(repairTx);
    });
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
