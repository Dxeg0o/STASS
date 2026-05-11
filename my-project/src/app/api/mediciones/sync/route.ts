import { NextResponse } from "next/server";
import { and, desc, eq, gt, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import {
  cajaLoteSession,
  conteo,
  dispositivoServicio,
  loteServicio,
  loteSession,
  servicio,
} from "@/db/schema";
import { verifyDeviceKey } from "@/lib/device-auth";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface RawMedicion {
  ts: unknown;
  perimeter: unknown;
  direction: unknown;
}

interface ValidMedicion {
  ts: Date;
  perimeter: number | null;
  direction: 0 | 1;
}

// ── Validación ────────────────────────────────────────────────────────────────

const MAX_BATCH_SIZE = 10_000;

function validateMediciones(
  raw: unknown
): { data: ValidMedicion[] } | { error: string } {
  if (!Array.isArray(raw)) return { error: "mediciones debe ser un array" };
  if (raw.length === 0) return { error: "mediciones no puede estar vacío" };
  if (raw.length > MAX_BATCH_SIZE)
    return { error: `máximo ${MAX_BATCH_SIZE} mediciones por request` };

  const validated: ValidMedicion[] = [];

  for (let i = 0; i < raw.length; i++) {
    const m = raw[i] as RawMedicion;

    if (typeof m !== "object" || m === null)
      return { error: `medicion[${i}]: debe ser un objeto` };

    const ts = new Date(m.ts as string);
    if (isNaN(ts.getTime()))
      return { error: `medicion[${i}].ts: fecha inválida` };

    if (typeof m.perimeter !== "number" || m.perimeter < 0)
      return { error: `medicion[${i}].perimeter: debe ser número no negativo` };

    const perimeterValue = m.perimeter === 0 ? null : m.perimeter;

    if (m.direction !== 0 && m.direction !== 1)
      return { error: `medicion[${i}].direction: debe ser 0 (in) o 1 (out)` };

    validated.push({ ts, perimeter: perimeterValue, direction: m.direction });
  }

  return { data: validated };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Autenticación del dispositivo por API key
  const device = await verifyDeviceKey(request);
  if (!device) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parsear y validar body
  let body: { mediciones?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const validation = validateMediciones(body.mediciones);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const mediciones = validation.data;

  const minTs = mediciones.reduce(
    (min, medicion) => (medicion.ts < min ? medicion.ts : min),
    mediciones[0].ts
  );
  const maxTs = mediciones.reduce(
    (max, medicion) => (medicion.ts > max ? medicion.ts : max),
    mediciones[0].ts
  );

  // 3. Resolver sesiones del dispositivo que cubren el rango temporal del batch.
  //    La cola local puede enviar eventos antiguos; por eso cada medición debe
  //    calzar por timestamp y no por la sesión abierta al momento del POST.
  const sessionAssignments = await db
    .select({
      id: loteSession.id,
      loteId: loteSession.loteId,
      startTime: loteSession.startTime,
      endTime: loteSession.endTime,
    })
    .from(loteSession)
    .where(
      and(
        eq(loteSession.dispositivoId, device.id),
        lte(loteSession.startTime, maxTs),
        or(isNull(loteSession.endTime), gt(loteSession.endTime, minTs))
      )
    )
    .orderBy(desc(loteSession.startTime));

  if (sessionAssignments.length === 0) {
    return NextResponse.json(
      {
        error:
          "No hay sesión de lote para este dispositivo en el rango temporal del batch",
      },
      { status: 409 }
    );
  }

  // 4. Resolver servicios por intervalo temporal del dispositivo.
  const serviceAssignments = await db
    .select({
      servicioId: servicio.id,
      usaCajas: servicio.usaCajas,
      fechaInicio: dispositivoServicio.fechaInicio,
      fechaTermino: dispositivoServicio.fechaTermino,
    })
    .from(dispositivoServicio)
    .innerJoin(servicio, eq(servicio.id, dispositivoServicio.servicioId))
    .where(
      and(
        eq(dispositivoServicio.dispositivoId, device.id),
        isNotNull(dispositivoServicio.fechaInicio),
        lte(dispositivoServicio.fechaInicio, maxTs),
        or(
          isNull(dispositivoServicio.fechaTermino),
          gt(dispositivoServicio.fechaTermino, minTs)
        )
      )
    )
    .orderBy(desc(dispositivoServicio.fechaInicio));

  if (serviceAssignments.length === 0) {
    return NextResponse.json(
      { error: "No hay asignación de servicio vigente para este dispositivo" },
      { status: 409 }
    );
  }

  const rowsWithContext = mediciones.map((medicion, index) => {
    const session = sessionAssignments.find((candidate) => {
      const startsBeforeOrAt = medicion.ts >= candidate.startTime;
      const endsAfter =
        candidate.endTime === null || medicion.ts < candidate.endTime;
      return startsBeforeOrAt && endsAfter;
    });

    const assignment = serviceAssignments.find((candidate) => {
      if (!candidate.fechaInicio) return false;
      const startsBeforeOrAt = medicion.ts >= candidate.fechaInicio;
      const endsAfter =
        candidate.fechaTermino === null || medicion.ts < candidate.fechaTermino;
      return startsBeforeOrAt && endsAfter;
    });

    return {
      index,
      medicion,
      session: session ?? null,
      assignment: assignment ?? null,
    };
  });

  const missingSession = rowsWithContext.find((row) => !row.session);
  if (missingSession) {
    return NextResponse.json(
      {
        error: `medicion[${missingSession.index}]: no calza con una sesión temporal del dispositivo`,
      },
      { status: 409 }
    );
  }

  const missingAssignment = rowsWithContext.find((row) => !row.assignment);
  if (missingAssignment) {
    return NextResponse.json(
      {
        error: `medicion[${missingAssignment.index}]: no calza con una asignación temporal del dispositivo`,
      },
      { status: 409 }
    );
  }

  const resolvedServicioIds = [
    ...new Set(rowsWithContext.map((row) => row.assignment!.servicioId)),
  ];
  const resolvedLoteIds = [
    ...new Set(rowsWithContext.map((row) => row.session!.loteId)),
  ];

  const loteAssignments = await db
    .select({
      loteId: loteServicio.loteId,
      servicioId: loteServicio.servicioId,
    })
    .from(loteServicio)
    .where(
      and(
        inArray(loteServicio.loteId, resolvedLoteIds),
        inArray(loteServicio.servicioId, resolvedServicioIds)
      )
    );
  const loteServicioIds = new Set(
    loteAssignments.map(
      (assignment) => `${assignment.loteId}:${assignment.servicioId}`
    )
  );
  const missingLoteServicio = rowsWithContext.find(
    (row) =>
      !loteServicioIds.has(
        `${row.session!.loteId}:${row.assignment!.servicioId}`
      )
  );

  if (missingLoteServicio) {
    return NextResponse.json(
      {
        error: "El lote activo no está asignado al servicio resuelto para el dispositivo",
        loteId: missingLoteServicio.session!.loteId,
        servicioId: missingLoteServicio.assignment!.servicioId,
      },
      { status: 409 }
    );
  }

  const cajaSessionIds = [
    ...new Set(
      rowsWithContext
        .filter((row) => row.assignment?.usaCajas)
        .map((row) => row.session!.id)
    ),
  ];
  const cajaByLoteSessionId = new Map<string, string>();
  const anyServiceUsesCajas = rowsWithContext.some(
    (row) => row.assignment?.usaCajas
  );
  if (anyServiceUsesCajas) {
    const activeCajas = await db
      .select({
        id: cajaLoteSession.id,
        loteSessionId: cajaLoteSession.loteSessionId,
      })
      .from(cajaLoteSession)
      .where(
        and(
          inArray(cajaLoteSession.loteSessionId, cajaSessionIds),
          isNull(cajaLoteSession.retiradoAt)
        )
      )
      .orderBy(desc(cajaLoteSession.asignadoAt));

    for (const activeCaja of activeCajas) {
      if (!cajaByLoteSessionId.has(activeCaja.loteSessionId)) {
        cajaByLoteSessionId.set(activeCaja.loteSessionId, activeCaja.id);
      }
    }
  }

  // 5. Bulk INSERT — un solo statement para N filas.
  //    El trigger STATEMENT-level (migración 0009) dispara UNA vez
  //    y agrega todo el batch a lote_stats; caja_stats solo si hay caja activa.
  await db.insert(conteo).values(
    rowsWithContext.map(({ medicion, session, assignment }) => ({
      ts: medicion.ts,
      loteId: session!.loteId,
      servicioId: assignment!.servicioId,
      dispositivoId: device.id,
      cajaLoteSessionId: assignment!.usaCajas
        ? cajaByLoteSessionId.get(session!.id) ?? null
        : null,
      perimeter: medicion.perimeter,
      direction: medicion.direction,
    }))
  );

  return NextResponse.json({ accepted: mediciones.length }, { status: 200 });
}
