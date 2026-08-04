import { db } from "@/db";
import { dispositivoServicio, loteCierreCalibreBin } from "@/db/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

// Salida física de un calibrador y el calibre que declaró en un lote puntual.
//
// Vive acá y no en cada ruta porque hay dos páginas de lote (/app/lotes/[id] y
// /app/servicios/[id]/lotes/[id]) alimentadas por endpoints distintos, y la
// etiqueta tiene que salir igual en las dos.

export interface SalidaCalibre {
  salidaOrden: number | null;
  salidaNombre: string | null;
  /** Calibres declarados en el lote. Normalmente uno; varios si se recalibró. */
  calibres: string[];
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
    const actual = resultado.get(clave);
    if (actual) {
      if (!actual.calibres.includes(etiqueta)) actual.calibres.push(etiqueta);
    } else {
      resultado.set(clave, {
        salidaOrden: null,
        salidaNombre: null,
        calibres: [etiqueta],
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
        entrada.calibres.push(ETIQUETA_MERMA);
      }
    }
  }

  return resultado;
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
