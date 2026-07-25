import { and, asc, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { loteSession } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Canal de eventos para las tablets (Server-Sent Events).
//
// Existe para que, cuando una tablet cambia el lote, la otra se entere en
// segundos en vez de esperar su próximo sondeo. La app mantiene el sondeo de
// /sesion-activa como red de seguridad: este canal acelera la propagación, no
// es la única vía (ver session_events_service.dart en la app).
//
// Por qué polling server-side y no LISTEN/NOTIFY de Postgres: `src/db/index.ts`
// abre el pool con `max: 1` en producción, y una conexión dedicada a escuchar
// notificaciones se la quedaría entera durante toda la vida de la conexión SSE.
// Ya hubo un incidente de saturación del pooler ("max clients reached in
// session mode"). El sondeo de acá hace UNA consulta indexada cada
// POLL_MS y libera la conexión de inmediato.
//
// Costo real: reemplaza el sondeo del cliente cada 20 s (que arma el snapshot
// completo: sesiones + lote + cajas + conteo de cajas, ~4 consultas) por una
// sola consulta liviana cada 4 s, y el cliente sólo pide el snapshot completo
// cuando de verdad cambió algo.
//
// Techo de escala, a tener presente: cada tablet conectada es una invocación
// viva. Con las 2-3 tablets por servicio de hoy no hay problema; en el orden de
// las decenas habría que pasar a un canal real (Supabase Realtime, que no toca
// el pool de Postgres) en vez de subir la frecuencia de este sondeo.

const POLL_MS = 4000;
const KEEPALIVE_MS = 15000;
// Presupuesto de vida del stream. Tiene que dejar margen para cerrar
// ordenadamente ANTES de que la plataforma corte la función, así el cliente
// reconecta porque se lo pedimos y no por un error de red.
//
// Se descuenta un ciclo de sondeo completo además del margen: si sólo se
// descontara el margen, el ciclo podría dormir POLL_MS pasado el límite y el
// cierre caería justo sobre el corte de la plataforma (medido: 60,9 s con
// maxDuration=60).
const SAFETY_MS = 5000;
const LIFETIME_MS = maxDuration * 1000 - POLL_MS - SAFETY_MS;

/**
 * Firma del estado de sesión de estos dispositivos. Si cambia, cambió algo que
 * a la tablet le importa: el lote activo, o qué sesiones están abiertas.
 */
async function sessionSignature(dispositivoIds: string[]): Promise<string> {
  const rows = await db
    .select({
      id: loteSession.id,
      loteId: loteSession.loteId,
      dispositivoId: loteSession.dispositivoId,
      startTime: loteSession.startTime,
    })
    .from(loteSession)
    .where(
      and(
        inArray(loteSession.dispositivoId, dispositivoIds),
        isNull(loteSession.endTime)
      )
    )
    .orderBy(asc(loteSession.startTime));

  return rows
    .map((r) => `${r.id}:${r.loteId}:${r.startTime.toISOString()}`)
    .join("|");
}

function activeLoteIdFrom(signature: string): string | null {
  if (!signature) return null;
  // La última por start_time es la activa, igual criterio que
  // getActiveSessionSnapshot.
  const parts = signature.split("|");
  const last = parts[parts.length - 1].split(":");
  return last[1] ?? null;
}

export async function GET(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dispositivoIds = (searchParams.get("dispositivoIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (dispositivoIds.length === 0) {
    return Response.json(
      { error: "dispositivoIds es requerido" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = Date.now();
      let closed = false;
      let lastKeepalive = Date.now();

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          closed = true;
        }
      };

      const finish = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* ya cerrado por el cliente */
        }
      };

      // El cliente se fue (app cerrada, pantalla pausada, red cortada).
      request.signal.addEventListener("abort", finish);

      let signature: string;
      try {
        signature = await sessionSignature(dispositivoIds);
      } catch (e) {
        send("error", { message: (e as Error).message });
        finish();
        return;
      }

      // Estado inicial: le permite a la tablet detectar de entrada que se
      // perdió un cambio mientras estaba desconectada.
      send("sesion_actual", {
        lote_id: activeLoteIdFrom(signature),
        at: new Date().toISOString(),
      });

      const deadline = startedAt + LIFETIME_MS;

      while (!closed) {
        if (request.signal.aborted) break;

        // Cierre ordenado antes del límite de la plataforma: el cliente
        // reconecta por indicación nuestra, no por un corte. Se decide ANTES de
        // dormir, contando lo que va a durar el sueño, para no despertar del
        // otro lado del límite.
        if (Date.now() + POLL_MS >= deadline) {
          send("reconnect", { reason: "lifetime" });
          break;
        }

        await new Promise((r) => setTimeout(r, POLL_MS));
        if (closed || request.signal.aborted) break;

        let next: string;
        try {
          next = await sessionSignature(dispositivoIds);
        } catch {
          // Error transitorio de base: no se corta el canal, se reintenta en el
          // próximo ciclo. Cortar acá provocaría una tormenta de reconexiones
          // justo cuando la base está en problemas.
          continue;
        }

        if (next !== signature) {
          signature = next;
          send("lote_session_changed", {
            lote_id: activeLoteIdFrom(next),
            dispositivo_ids: dispositivoIds,
            at: new Date().toISOString(),
          });
        } else if (Date.now() - lastKeepalive > KEEPALIVE_MS) {
          // Comentario SSE: mantiene viva la conexión sin generar un evento.
          if (!closed) {
            try {
              controller.enqueue(encoder.encode(": keepalive\n\n"));
              lastKeepalive = Date.now();
            } catch {
              closed = true;
            }
          }
        }
      }

      finish();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Evita que un proxy intermedio acumule la respuesta en buffer y anule
      // el streaming.
      "X-Accel-Buffering": "no",
    },
  });
}
