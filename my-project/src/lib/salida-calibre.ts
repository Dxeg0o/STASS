import { db } from "@/db";
import {
  dispositivo,
  dispositivoServicio,
  loteCierreCalibreBin,
} from "@/db/schema";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

// Salida física de un calibrador y el calibre que declaró en un lote puntual.
//
// Vive acá y no en cada ruta porque hay dos páginas de lote (/app/lotes/[id] y
// /app/servicios/[id]/lotes/[id]) alimentadas por endpoints distintos, y la
// etiqueta tiene que salir igual en las dos.

/** Un rango de calibre declarado por una salida, con los bins que sacó. */
export interface CalibreDeclarado {
  /** "10/12", o "merma" / "merma >20" en los rangos abiertos. */
  etiqueta: string;
  /** Bins declarados para este rango. Null en la merma, que no lleva bins. */
  bins: number | null;
}

/**
 * True si lo que salió por acá es merma. Cubre los dos casos que la producen:
 * el rango abierto (no cierran el calibre) y la salida que no declaró nada en un
 * lote que sí tuvo cierre.
 *
 * Se marca en el dato y no se deduce del texto en la UI, para que el criterio
 * viva en un solo lugar.
 */
export function esMerma(calibres: CalibreDeclarado[]): boolean {
  return calibres.some((c) => c.etiqueta.startsWith(ETIQUETA_MERMA));
}

export interface SalidaCalibre {
  salidaOrden: number | null;
  salidaNombre: string | null;
  /**
   * Calibres declarados en el lote. Normalmente uno — dentro de un lote cada
   * calibre pertenece a una sola salida (34/34 casos reales) — pero pueden ser
   * varios si se recalibró a mitad de proceso.
   */
  calibres: CalibreDeclarado[];
}

export interface ParDispositivoServicio {
  dispositivoId: string;
  servicioId: string;
}

/** Clave del mapa que devuelve `resolverSalidasCalibre`. */
export function claveParDispositivoServicio(
  dispositivoId: string,
  servicioId: string
): string {
  return `${dispositivoId}|${servicioId}`;
}

/** Etiqueta de la salida que quedó sin calibre en un lote ya cerrado. */
export const ETIQUETA_MERMA = "merma";

// Un extremo abierto tampoco es un calibre cerrado: es merma con umbral. Se
// etiqueta como tal para que se lea "merma >20" y no un rango que parezca un
// calibre.
//
// Los signos siguen a declaradoLabel() de /api/app/lotes/resumen-calibres —
// "<to" y ">from", no "≤"/"+": el modelo no guarda si el extremo es inclusivo,
// así que inventar "≤" afirmaría algo que el dato no dice.
export function formatCalibre(
  from: number | null,
  to: number | null
): string | null {
  if (from != null && to != null) return `${from}/${to}`;
  if (from != null) return `${ETIQUETA_MERMA} >${from}`;
  if (to != null) return `${ETIQUETA_MERMA} <${to}`;
  return null;
}

/**
 * Resuelve salida y calibre para pares (dispositivo, servicio) concretos.
 *
 * Se pide el par y no solo el dispositivo a propósito: un equipo suele estar
 * vinculado a varios servicios y solo en algunos tiene salida configurada.
 * Resolviendo por dispositivo, la "Salida 2" de un servicio se filtra a lotes
 * de otro servicio que no usa salidas.
 */
export async function resolverSalidasCalibre(
  loteId: string,
  pares: ParDispositivoServicio[]
): Promise<Map<string, SalidaCalibre>> {
  const resultado = new Map<string, SalidaCalibre>();
  if (pares.length === 0) return resultado;

  const dispositivoIds = [...new Set(pares.map((p) => p.dispositivoId))];
  const servicioIds = [...new Set(pares.map((p) => p.servicioId))];
  const paresValidos = new Set(
    pares.map((p) => claveParDispositivoServicio(p.dispositivoId, p.servicioId))
  );

  // Se siembra una entrada por par para poder distinguir después "salida sin
  // calibre" de "salida que no existe".
  for (const clave of paresValidos) {
    resultado.set(clave, {
      salidaOrden: null,
      salidaNombre: null,
      calibres: [],
    });
  }

  // La salida vive en dispositivo_servicio: es configurable por servicio, no es
  // una propiedad del equipo.
  const salidaRows = await db
    .select({
      dispositivoId: dispositivoServicio.dispositivoId,
      servicioId: dispositivoServicio.servicioId,
      salidaOrden: dispositivoServicio.salidaOrden,
      salidaNombre: dispositivoServicio.salidaNombre,
    })
    .from(dispositivoServicio)
    .where(
      and(
        inArray(dispositivoServicio.dispositivoId, dispositivoIds),
        inArray(dispositivoServicio.servicioId, servicioIds)
      )
    );

  for (const row of salidaRows) {
    const clave = claveParDispositivoServicio(row.dispositivoId, row.servicioId);
    if (!paresValidos.has(clave)) continue;
    const actual = resultado.get(clave);
    resultado.set(clave, {
      salidaOrden: row.salidaOrden,
      salidaNombre: row.salidaNombre,
      calibres: actual?.calibres ?? [],
    });
  }

  // El calibre lo escribe la tablet al cerrar el lote. Se resuelve por lote y no
  // se puede cachear como atributo de la salida: la misma salida corre calibres
  // distintos en lotes distintos.
  const calibreRows = await db
    .select({
      dispositivoId: loteCierreCalibreBin.dispositivoId,
      servicioId: loteCierreCalibreBin.servicioId,
      calibreFrom: loteCierreCalibreBin.calibreFrom,
      calibreTo: loteCierreCalibreBin.calibreTo,
      // Se suma porque el group by es por rango: si un rango tuviera mas de una
      // fila (misma salida, mismo calibre) los bins son del rango, no de la fila.
      bins: sql<string | null>`SUM(${loteCierreCalibreBin.bins})`,
    })
    .from(loteCierreCalibreBin)
    .where(
      and(
        eq(loteCierreCalibreBin.loteId, loteId),
        isNotNull(loteCierreCalibreBin.dispositivoId),
        inArray(loteCierreCalibreBin.dispositivoId, dispositivoIds)
      )
    )
    .groupBy(
      loteCierreCalibreBin.dispositivoId,
      loteCierreCalibreBin.servicioId,
      loteCierreCalibreBin.calibreFrom,
      loteCierreCalibreBin.calibreTo
    )
    .orderBy(loteCierreCalibreBin.calibreFrom, loteCierreCalibreBin.calibreTo);

  let huboDeclaracion = false;
  for (const row of calibreRows) {
    if (!row.dispositivoId) continue;
    const clave = claveParDispositivoServicio(row.dispositivoId, row.servicioId);
    if (!paresValidos.has(clave)) continue;
    const etiqueta = formatCalibre(row.calibreFrom, row.calibreTo);
    if (!etiqueta) continue;
    huboDeclaracion = true;
    const calibre = {
      etiqueta,
      bins: row.bins == null ? null : Number(row.bins),
    };
    const actual = resultado.get(clave);
    if (actual) {
      if (!actual.calibres.some((c) => c.etiqueta === etiqueta)) {
        actual.calibres.push(calibre);
      }
    } else {
      resultado.set(clave, {
        salidaOrden: null,
        salidaNombre: null,
        calibres: [calibre],
      });
    }
  }

  // La merma no se declara con un rango: se deja sin declarar. En la práctica la
  // operaria declara el calibre de cada salida que sacó producto calibrado y deja
  // en blanco la que salió merma — no existe ninguna fila con ambos extremos
  // nulos en la base, así que este es el único caso real de merma.
  //
  // Se exige que el lote tenga al menos otra salida declarada: eso confirma que
  // el cierre ocurrió. Sin esa condición, un lote nunca cerrado (o uno donde se
  // olvidó declarar) mostraría todas sus salidas como merma, afirmando algo que
  // el dato no respalda.
  if (huboDeclaracion) {
    for (const entrada of resultado.values()) {
      if (entrada.calibres.length === 0) {
        // Sin bins: la merma no se declara, se deduce de la ausencia de calibre,
        // asi que no hay ningun numero de bins que mostrar.
        entrada.calibres.push({ etiqueta: ETIQUETA_MERMA, bins: null });
      }
    }
  }

  return resultado;
}

export interface SalidaConfigurada {
  dispositivoId: string;
  dispositivoNombre: string;
  servicioId: string;
  salidaOrden: number;
  salidaNombre: string | null;
}

/**
 * Salidas que el calibrador tiene configuradas hoy en estos servicios.
 *
 * Sirve para listar una salida que no produjo nada en el lote: las tablas se
 * arman desde lote_total_stats, que solo tiene filas de equipos con conteos, y
 * sin esto una salida en cero desaparece de la tabla en vez de mostrarse en 0
 * — que es justamente la información de que esa salida no sacó nada.
 *
 * Solo vínculos vigentes (fecha_termino IS NULL): la salida es la configuración
 * actual del calibrador. Para un lote antiguo eso puede mostrar en 0 una salida
 * que no existía entonces, pero es preferible a esconder una salida activa.
 */
export async function salidasConfiguradas(
  servicioIds: string[]
): Promise<SalidaConfigurada[]> {
  if (servicioIds.length === 0) return [];
  const rows = await db
    .select({
      dispositivoId: dispositivoServicio.dispositivoId,
      dispositivoNombre: dispositivo.nombre,
      servicioId: dispositivoServicio.servicioId,
      salidaOrden: dispositivoServicio.salidaOrden,
      salidaNombre: dispositivoServicio.salidaNombre,
    })
    .from(dispositivoServicio)
    .innerJoin(dispositivo, eq(dispositivo.id, dispositivoServicio.dispositivoId))
    .where(
      and(
        inArray(dispositivoServicio.servicioId, servicioIds),
        isNull(dispositivoServicio.fechaTermino),
        isNotNull(dispositivoServicio.salidaOrden)
      )
    );
  return rows.flatMap((row) =>
    row.salidaOrden == null
      ? []
      : [{ ...row, salidaOrden: row.salidaOrden }]
  );
}

/**
 * Orden de salidas tal como lo hace /api/app/dispositivos: por salidaOrden con
 * los nulos al final, y entre nulos por nombre. Así la tabla web y la tablet
 * listan las salidas igual.
 */
export function compararPorSalida(
  a: { salidaOrden: number | null; dispositivoNombre: string },
  b: { salidaOrden: number | null; dispositivoNombre: string }
): number {
  if (a.salidaOrden != null && b.salidaOrden != null) {
    return a.salidaOrden - b.salidaOrden;
  }
  if (a.salidaOrden != null) return -1;
  if (b.salidaOrden != null) return 1;
  return a.dispositivoNombre.localeCompare(b.dispositivoNombre, "es");
}
