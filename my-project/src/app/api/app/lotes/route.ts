import { NextResponse } from "next/server";
import { and, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { lote, loteServicio, servicio } from "@/db/schema";
import { verifyAppKey } from "@/lib/app-auth";
import { isUniqueViolation } from "@/lib/app-idempotent";
import { fetchLoteById, fetchLotesByIds, sortLotes } from "@/lib/app-lote";

export async function GET(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const servicioId = searchParams.get("servicioId");
  if (!servicioId) {
    return NextResponse.json(
      { error: "servicioId es requerido" },
      { status: 400 }
    );
  }

  const links = await db
    .select({ loteId: loteServicio.loteId })
    .from(loteServicio)
    .where(eq(loteServicio.servicioId, servicioId));

  const loteIds = [...new Set(links.map((l) => l.loteId))];
  const lotes = sortLotes(await fetchLotesByIds(loteIds));

  return NextResponse.json({ lotes }, { status: 200 });
}

interface PostBody {
  servicio_id?: unknown;
  codigo_lote?: unknown;
  variedad_id?: unknown;
  subvariedad_id?: unknown;
  id?: unknown;
}

// Crea (o reusa, si ya existe con ese código en el servicio) un lote y lo
// asigna al servicio actual. Ver docs/plan_crear_asignar_lote.md.
export async function POST(request: Request) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const body = raw as PostBody;

  if (typeof body.servicio_id !== "string" || !body.servicio_id) {
    return NextResponse.json(
      { error: "servicio_id es requerido" },
      { status: 400 }
    );
  }
  const servicioId = body.servicio_id;

  const srv = await db.query.servicio.findFirst({
    where: eq(servicio.id, servicioId),
  });
  if (!srv) {
    return NextResponse.json(
      { error: "Servicio no encontrado" },
      { status: 404 }
    );
  }

  const codigoLote =
    typeof body.codigo_lote === "string" && body.codigo_lote.trim()
      ? body.codigo_lote.trim()
      : null;
  const variedadId =
    typeof body.variedad_id === "string" && body.variedad_id
      ? body.variedad_id
      : null;
  const subvariedadId =
    typeof body.subvariedad_id === "string" && body.subvariedad_id
      ? body.subvariedad_id
      : null;
  const clientId = typeof body.id === "string" && body.id ? body.id : null;
  const empresaId = srv.empresaId;

  // Deduplicación por EMPRESA: el código de lote es único por empresa. Si ya
  // existe (en cualquier servicio/proceso de la empresa) se reutiliza esa fila
  // y solo se asegura el vínculo con este servicio.
  if (codigoLote && empresaId) {
    const [existing] = await db
      .select({ id: lote.id })
      .from(lote)
      .where(
        and(eq(lote.empresaId, empresaId), ilike(lote.codigoLote, codigoLote))
      )
      .limit(1);

    if (existing) {
      await db
        .insert(loteServicio)
        .values({ loteId: existing.id, servicioId })
        .onConflictDoNothing();
      const dto = await fetchLoteById(existing.id);
      return NextResponse.json({ ...dto, ya_existia: true }, { status: 200 });
    }
  }

  try {
    const createdId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(lote)
        .values({
          ...(clientId ? { id: clientId } : {}),
          codigoLote,
          empresaId,
          variedadId,
          subvariedadId,
          createdAt: new Date(),
        })
        .returning({ id: lote.id });

      await tx.insert(loteServicio).values({
        loteId: created.id,
        servicioId,
      });

      return created.id;
    });

    const dto = await fetchLoteById(createdId);
    return NextResponse.json({ ...dto, ya_existia: false }, { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e)) {
      // Reintento offline con el mismo id de cliente: idempotente.
      if (clientId) {
        const dto = await fetchLoteById(clientId);
        if (dto) {
          // Asegura que también quedó la asignación al servicio (por si el
          // primer intento se cortó justo entre los dos inserts).
          await db
            .insert(loteServicio)
            .values({ loteId: clientId, servicioId })
            .onConflictDoNothing();
          return NextResponse.json({ ...dto, ya_existia: true }, { status: 200 });
        }
      }
      // Violación del índice único por empresa (carrera con otro request con el
      // mismo código): reutilizar la fila existente y vincularla al servicio.
      if (codigoLote && empresaId) {
        const [existing] = await db
          .select({ id: lote.id })
          .from(lote)
          .where(
            and(eq(lote.empresaId, empresaId), ilike(lote.codigoLote, codigoLote))
          )
          .limit(1);
        if (existing) {
          await db
            .insert(loteServicio)
            .values({ loteId: existing.id, servicioId })
            .onConflictDoNothing();
          const dto = await fetchLoteById(existing.id);
          return NextResponse.json({ ...dto, ya_existia: true }, { status: 200 });
        }
      }
    }
    throw e;
  }
}
