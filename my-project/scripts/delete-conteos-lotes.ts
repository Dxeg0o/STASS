/**
 * Borra los conteos de lotes de prueba de un servicio, junto con los agregados
 * que dependen de ellos.
 *
 * El trigger `conteo_stats_trigger` es AFTER INSERT ... FOR EACH STATEMENT: no
 * existe camino de DELETE, asi que lote_stats / lote_total_stats / caja_stats /
 * caja_total_stats / lote_calibre_declarado_dia quedan inflados si solo se borra
 * `conteo`. Este script los limpia en la misma transaccion que el borrado.
 *
 * NO toca `lote_servicio` ni `lote_cierre_calibre_bin`: los lotes siguen
 * vinculados al servicio, solo se quedan sin mediciones.
 *
 * Por defecto solo informa. Para escribir en la base:
 *   npm run delete:conteos-lotes -- --apply --yes
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

type Sql = postgres.Sql<Record<string, unknown>>;

const SERVICE_ID = "1fb2d8f5-c66c-4069-a78a-5e98d403c1a1";
const SERVICE_NAME = "Planting Stock Pelú";
const LOT_CODES = ["620.25.V4", "615.25.V4", "TEST1", "TEST2", "TEST3"];

type LoteScope = {
  lote_id: string;
  codigo_lote: string;
  conteos: number;
  conteos_otros_servicios: number;
};

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

async function readService(sql: Sql) {
  const rows = await sql<{ id: string; nombre: string; empresa_id: string; modo_calibre: string }[]>`
    SELECT id, nombre, empresa_id, modo_calibre FROM servicio WHERE id = ${SERVICE_ID}
  `;
  if (rows.length !== 1) throw new Error(`Servicio no encontrado: ${SERVICE_ID}`);
  if (rows[0].nombre !== SERVICE_NAME) {
    throw new Error(`El servicio ${SERVICE_ID} se llama "${rows[0].nombre}", se esperaba "${SERVICE_NAME}"`);
  }
  return rows[0];
}

/**
 * `codigo_lote` es unico por empresa via un indice parcial sobre
 * lower(trim(codigo_lote)) — el mismo codigo puede existir en otra empresa, asi
 * que el scope se acota siempre con empresa_id.
 */
async function readScope(sql: Sql, empresaId: string) {
  const rows = await sql<LoteScope[]>`
    SELECT
      l.id AS lote_id,
      l.codigo_lote,
      (SELECT COUNT(*)::int FROM conteo c
        WHERE c.lote_id = l.id AND c.servicio_id = ${SERVICE_ID}) AS conteos,
      (SELECT COUNT(*)::int FROM conteo c
        WHERE c.lote_id = l.id AND c.servicio_id <> ${SERVICE_ID}) AS conteos_otros_servicios
    FROM lote l
    WHERE l.empresa_id = ${empresaId}
      AND lower(trim(l.codigo_lote)) = ANY(${LOT_CODES.map((code) => code.toLowerCase())})
    ORDER BY l.codigo_lote
  `;
  const found = new Set(rows.map((row) => row.codigo_lote.trim().toLowerCase()));
  const missing = LOT_CODES.filter((code) => !found.has(code.toLowerCase()));
  if (missing.length) throw new Error(`Lotes no encontrados en la empresa: ${missing.join(", ")}`);
  return rows;
}

async function readAggregates(sql: Sql, loteIds: string[]) {
  const [row] = await sql<{
    lote_stats: number;
    lote_total_stats: number;
    caja_stats: number;
    caja_total_stats: number;
    declarado_dia: number;
    sesiones_abiertas: number;
  }[]>`
    WITH cajas AS (
      SELECT cls.id
      FROM caja_lote_session cls
      JOIN lote_session ls ON ls.id = cls.lote_session_id
      WHERE ls.lote_id = ANY(${loteIds}::uuid[])
    )
    SELECT
      (SELECT COUNT(*)::int FROM lote_stats
        WHERE lote_id = ANY(${loteIds}::uuid[]) AND servicio_id = ${SERVICE_ID}) AS lote_stats,
      (SELECT COUNT(*)::int FROM lote_total_stats
        WHERE lote_id = ANY(${loteIds}::uuid[]) AND servicio_id = ${SERVICE_ID}) AS lote_total_stats,
      (SELECT COUNT(*)::int FROM caja_stats WHERE caja_lote_session_id IN (SELECT id FROM cajas)) AS caja_stats,
      (SELECT COUNT(*)::int FROM caja_total_stats WHERE caja_lote_session_id IN (SELECT id FROM cajas)) AS caja_total_stats,
      (SELECT COUNT(*)::int FROM lote_calibre_declarado_dia
        WHERE lote_id = ANY(${loteIds}::uuid[]) AND servicio_id = ${SERVICE_ID}) AS declarado_dia,
      (SELECT COUNT(*)::int FROM lote_session
        WHERE lote_id = ANY(${loteIds}::uuid[]) AND end_time IS NULL) AS sesiones_abiertas
  `;
  return row;
}

/** Sesiones de caja del lote, sin importar a que servicio pertenecen. */
function cajaSessionsOfLote(sql: Sql, loteId: string) {
  return sql`
    SELECT cls.id FROM caja_lote_session cls
    JOIN lote_session ls ON ls.id = cls.lote_session_id
    WHERE ls.lote_id = ${loteId}
  `;
}

async function rebuildCajaStats(sql: Sql, loteId: string) {
  const deleted = await sql`
    DELETE FROM caja_stats
    WHERE caja_lote_session_id IN (${cajaSessionsOfLote(sql, loteId)})
  `;
  await sql`
    INSERT INTO caja_stats (caja_lote_session_id, dispositivo_id, calibre, count_in, count_out, first_ts, last_ts)
    SELECT c.caja_lote_session_id, c.dispositivo_id, ROUND(c.perimeter::numeric, 1)::real,
      SUM((c.direction = 0)::int)::int, SUM((c.direction = 1)::int)::int, MIN(c.ts), MAX(c.ts)
    FROM conteo c
    WHERE c.caja_lote_session_id IN (${cajaSessionsOfLote(sql, loteId)})
      AND c.perimeter IS NOT NULL
    GROUP BY 1, 2, 3
  `;
  return deleted.count;
}

async function rebuildCajaTotalStats(sql: Sql, loteId: string) {
  const deleted = await sql`
    DELETE FROM caja_total_stats
    WHERE caja_lote_session_id IN (${cajaSessionsOfLote(sql, loteId)})
  `;
  await sql`
    INSERT INTO caja_total_stats (caja_lote_session_id, dispositivo_id, count_in, count_out, first_ts, last_ts)
    SELECT c.caja_lote_session_id, c.dispositivo_id,
      SUM((c.direction = 0)::int)::int, SUM((c.direction = 1)::int)::int, MIN(c.ts), MAX(c.ts)
    FROM conteo c
    WHERE c.caja_lote_session_id IN (${cajaSessionsOfLote(sql, loteId)})
    GROUP BY 1, 2
  `;
  return deleted.count;
}

async function deleteLote(sql: Sql, scope: LoteScope) {
  await sql.begin(async (tx) => {
    const del = tx as unknown as Sql;
    await del`SELECT pg_advisory_xact_lock(hashtext('delete_conteos_lotes_v1'))`;

    // Un unico DELETE por lote: la ruta de borrado no tiene trigger, asi que
    // trocearlo no aporta nada y si alargaria la transaccion.
    const conteos = await del`
      DELETE FROM conteo WHERE lote_id = ${scope.lote_id} AND servicio_id = ${SERVICE_ID}
    `;

    // caja_stats y caja_total_stats no tienen servicio_id: una misma sesion de
    // caja puede acumular conteos de varios servicios. Por eso no se borran, se
    // reconstruyen desde los conteos que sobreviven — si no queda ninguno el
    // INSERT no aporta filas y el efecto es el mismo que borrarlas. La
    // definicion replica la del trigger `update_lote_stats` (migracion 0018).
    const cajaStats = await rebuildCajaStats(del, scope.lote_id);
    const cajaTotalStats = await rebuildCajaTotalStats(del, scope.lote_id);
    const loteStats = await del`
      DELETE FROM lote_stats WHERE lote_id = ${scope.lote_id} AND servicio_id = ${SERVICE_ID}
    `;
    const loteTotalStats = await del`
      DELETE FROM lote_total_stats WHERE lote_id = ${scope.lote_id} AND servicio_id = ${SERVICE_ID}
    `;
    const declaradoDia = await del`
      DELETE FROM lote_calibre_declarado_dia WHERE lote_id = ${scope.lote_id} AND servicio_id = ${SERVICE_ID}
    `;

    await validateLote(del, scope.lote_id);

    console.log(
      `  ${scope.codigo_lote}: conteo ${conteos.count} · lote_stats ${loteStats.count} · ` +
        `lote_total_stats ${loteTotalStats.count} · caja_stats ${cajaStats} recalc · ` +
        `caja_total_stats ${cajaTotalStats} recalc · declarado_dia ${declaradoDia.count}`
    );
  });
}

/** Corre dentro de la transaccion: si algo no cuadra, lanza y hace rollback. */
async function validateLote(sql: Sql, loteId: string) {
  const [row] = await sql<{ total: number }[]>`
    SELECT (
      (SELECT COUNT(*) FROM conteo WHERE lote_id = ${loteId} AND servicio_id = ${SERVICE_ID}) +
      (SELECT COUNT(*) FROM lote_stats WHERE lote_id = ${loteId} AND servicio_id = ${SERVICE_ID}) +
      (SELECT COUNT(*) FROM lote_total_stats WHERE lote_id = ${loteId} AND servicio_id = ${SERVICE_ID}) +
      (SELECT COUNT(*) FROM lote_calibre_declarado_dia WHERE lote_id = ${loteId} AND servicio_id = ${SERVICE_ID})
    )::int AS total
  `;
  if (row.total !== 0) throw new Error(`Quedaron ${row.total} filas para el lote ${loteId}`);

  // Los agregados de caja se reconstruyeron, no se borraron: deben cuadrar
  // exactamente con los conteos que sobrevivieron (de este lote en otros
  // servicios), no quedar en cero.
  const cajaMismatches = await sql`
    WITH cajas AS (
      SELECT cls.id FROM caja_lote_session cls
      JOIN lote_session ls ON ls.id = cls.lote_session_id
      WHERE ls.lote_id = ${loteId}
    ), esperado AS (
      SELECT caja_lote_session_id, dispositivo_id,
        SUM((direction = 0)::int)::int AS count_in, SUM((direction = 1)::int)::int AS count_out
      FROM conteo WHERE caja_lote_session_id IN (SELECT id FROM cajas)
      GROUP BY 1, 2
    ), actual AS (
      SELECT caja_lote_session_id, dispositivo_id, count_in, count_out
      FROM caja_total_stats WHERE caja_lote_session_id IN (SELECT id FROM cajas)
    )
    SELECT 1 FROM esperado e FULL OUTER JOIN actual a USING (caja_lote_session_id, dispositivo_id)
    WHERE e.count_in IS DISTINCT FROM a.count_in OR e.count_out IS DISTINCT FROM a.count_out
  `;
  if (cajaMismatches.length) throw new Error(`caja_total_stats no cuadra con conteo en ${loteId}`);

  const cajaCalibreMismatches = await sql`
    WITH cajas AS (
      SELECT cls.id FROM caja_lote_session cls
      JOIN lote_session ls ON ls.id = cls.lote_session_id
      WHERE ls.lote_id = ${loteId}
    ), esperado AS (
      SELECT caja_lote_session_id, dispositivo_id, ROUND(perimeter::numeric, 1)::real AS calibre,
        SUM((direction = 0)::int)::int AS count_in, SUM((direction = 1)::int)::int AS count_out
      FROM conteo
      WHERE caja_lote_session_id IN (SELECT id FROM cajas) AND perimeter IS NOT NULL
      GROUP BY 1, 2, 3
    ), actual AS (
      SELECT caja_lote_session_id, dispositivo_id, calibre, count_in, count_out
      FROM caja_stats WHERE caja_lote_session_id IN (SELECT id FROM cajas)
    )
    SELECT 1 FROM esperado e FULL OUTER JOIN actual a USING (caja_lote_session_id, dispositivo_id, calibre)
    WHERE e.count_in IS DISTINCT FROM a.count_in OR e.count_out IS DISTINCT FROM a.count_out
  `;
  if (cajaCalibreMismatches.length) throw new Error(`caja_stats no cuadra con conteo en ${loteId}`);

  const [link] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM lote_servicio
    WHERE lote_id = ${loteId} AND servicio_id = ${SERVICE_ID}
  `;
  if (link.count !== 1) throw new Error(`Se perdio el vinculo lote_servicio de ${loteId}`);
}

async function main() {
  const apply = hasFlag("--apply");
  if (apply && !hasFlag("--yes")) throw new Error("Para aplicar debes usar --apply --yes");
  // Borrar ~1,2M filas de una tabla de 16 GB es mas estable por la conexion
  // directa que por el pooler serverless.
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_POOLER;
  if (!url) throw new Error("Falta DATABASE_URL o DATABASE_URL_POOLER");
  const sql = postgres(url, { prepare: false, max: 1 });

  try {
    const service = await readService(sql);
    const scopes = await readScope(sql, service.empresa_id);
    const loteIds = scopes.map((scope) => scope.lote_id);
    const aggregates = await readAggregates(sql, loteIds);

    console.log(`${apply ? "APPLY" : "DRY-RUN"}: ${service.nombre} (${service.modo_calibre})`);
    console.table(
      scopes.map((scope) => ({
        lote: scope.codigo_lote,
        conteos: scope.conteos,
        "conteos otros servicios": scope.conteos_otros_servicios,
      }))
    );
    console.log(`Total de conteos a borrar: ${scopes.reduce((total, scope) => total + scope.conteos, 0)}`);
    console.table([aggregates]);

    if (aggregates.sesiones_abiertas > 0) {
      throw new Error(
        `Hay ${aggregates.sesiones_abiertas} lote_session sin cerrar: cierralas antes de borrar sus conteos`
      );
    }
    const conFugas = scopes.filter((scope) => scope.conteos_otros_servicios > 0);
    if (conFugas.length) {
      console.warn(
        `Aviso: ${conFugas.map((scope) => scope.codigo_lote).join(", ")} tienen conteos en otros ` +
          `servicios. Esos conteos NO se tocan y sus agregados de caja se recalculan a partir ` +
          `de lo que sobrevive, porque caja_stats no distingue servicio.`
      );
    }
    if (!apply) return;

    for (const scope of scopes) {
      await deleteLote(sql, scope);
    }

    // El borrado deja ~1,2M tuplas muertas: refrescar estadisticas para que el
    // planner no siga estimando con los conteos viejos. El espacio lo recupera
    // autovacuum.
    await sql`ANALYZE conteo`;
    console.log("Listo. ANALYZE conteo ejecutado.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
