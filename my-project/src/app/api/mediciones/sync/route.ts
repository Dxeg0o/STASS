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

  // 3. Resolver sesión activa del dispositivo.
  const [activeSession] = await db
    .select({
      id: loteSession.id,
      loteId: loteSession.loteId,
    })
    .from(loteSession)
    .where(
      and(eq(loteSession.dispositivoId, device.id), isNull(loteSession.endTime))
    )
    .orderBy(desc(loteSession.startTime))
    .limit(1);

  if (!activeSession) {
    return NextResponse.json(
      { error: "No hay sesión de lote activa para este dispositivo" },
      { status: 409 }
    );
  }

  // 4. Resolver servicios por intervalo temporal del dispositivo.
  const minTs = mediciones.reduce(
    (min, medicion) => (medicion.ts < min ? medicion.ts : min),
    mediciones[0].ts
  );
  const maxTs = mediciones.reduce(
    (max, medicion) => (medicion.ts > max ? medicion.ts : max),
    mediciones[0].ts
  );

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

  const rowsWithService = mediciones.map((medicion, index) => {
    const assignment = serviceAssignments.find((candidate) => {
      if (!candidate.fechaInicio) return false;
      const startsBeforeOrAt = medicion.ts >= candidate.fechaInicio;
      const endsAfter =
        candidate.fechaTermino === null || medicion.ts < candidate.fechaTermino;
      return startsBeforeOrAt && endsAfter;
    });

    if (!assignment) {
      return { index, medicion, assignment: null };
    }

    return { index, medicion, assignment };
  });

  const missingAssignment = rowsWithService.find((row) => !row.assignment);
  if (missingAssignment) {
    return NextResponse.json(
      {
        error: `medicion[${missingAssignment.index}]: no calza con una asignación temporal del dispositivo`,
      },
      { status: 409 }
    );
  }

  const resolvedServicioIds = [
    ...new Set(
      rowsWithService.map((row) => row.assignment!.servicioId)
    ),
  ];

  const loteAssignments = await db
    .select({ servicioId: loteServicio.servicioId })
    .from(loteServicio)
    .where(
      and(
        eq(loteServicio.loteId, activeSession.loteId),
        inArray(loteServicio.servicioId, resolvedServicioIds)
      )
    );
  const loteServicioIds = new Set(
    loteAssignments.map((assignment) => assignment.servicioId)
  );
  const missingLoteServicioId = resolvedServicioIds.find(
    (servicioId) => !loteServicioIds.has(servicioId)
  );

  if (missingLoteServicioId) {
    return NextResponse.json(
      {
        error: "El lote activo no está asignado al servicio resuelto para el dispositivo",
        servicioId: missingLoteServicioId,
      },
      { status: 409 }
    );
  }

  let activeCajaLoteSessionId: string | null = null;
  const anyServiceUsesCajas = rowsWithService.some(
    (row) => row.assignment?.usaCajas
  );
  if (anyServiceUsesCajas) {
    const [activeCaja] = await db
      .select({ id: cajaLoteSession.id })
      .from(cajaLoteSession)
      .where(
        and(
          eq(cajaLoteSession.loteSessionId, activeSession.id),
          isNull(cajaLoteSession.retiradoAt)
        )
      )
      .orderBy(desc(cajaLoteSession.asignadoAt))
      .limit(1);

    activeCajaLoteSessionId = activeCaja?.id ?? null;
  }

  // 5. Bulk INSERT — un solo statement para N filas.
  //    El trigger STATEMENT-level (migración 0009) dispara UNA vez
  //    y agrega todo el batch a lote_stats; caja_stats solo si hay caja activa.
  await db.insert(conteo).values(
    rowsWithService.map(({ medicion, assignment }) => ({
      ts: medicion.ts,
      loteId: activeSession.loteId,
      servicioId: assignment!.servicioId,
      dispositivoId: device.id,
      cajaLoteSessionId: assignment!.usaCajas ? activeCajaLoteSessionId : null,
      perimeter: medicion.perimeter,
      direction: medicion.direction,
    }))
  );

  return NextResponse.json({ accepted: mediciones.length }, { status: 200 });
}
