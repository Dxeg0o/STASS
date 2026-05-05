import { NextResponse } from "next/server";
import { db } from "@/db";
import { dispositivoServicio, empresa, empresaUsuario, proceso, servicio, usuario } from "@/db/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import ProcessCompletedEmail from "@/emails/ProcessCompletedEmail";
import { verifyEmpresaAdminFromPayload, verifyToken } from "@/lib/auth";
import React from "react";

const PROCESS_TRANSITIONS: Record<string, string[]> = {
  planificado: ["en_curso", "cancelado"],
  en_curso: ["completado", "cancelado"],
  cancelado: [],
  completado: [],
};

const VALID_ESTADOS = new Set([
  "planificado",
  "en_curso",
  "completado",
  "cancelado",
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ procesoId: string }> }
) {
  const { procesoId } = await params;

  const result = await db.query.proceso.findFirst({
    where: eq(proceso.id, procesoId),
    with: {
      tipoProceso: true,
      producto: true,
      servicios: {
        with: {
          loteServicios: {
            with: { lote: true },
          },
        },
      },
    },
  });

  if (!result) {
    return NextResponse.json({ error: "Proceso no encontrado" }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ procesoId: string }> }
) {
  const { procesoId } = await params;
  const body = await request.json();

  const current = await db.query.proceso.findFirst({
    where: eq(proceso.id, procesoId),
  });

  if (!current) {
    return NextResponse.json({ error: "Proceso no encontrado" }, { status: 404 });
  }

  const auth = await verifyEmpresaAdminFromPayload(
    await verifyToken(request),
    current.empresaId
  );
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (current.estado === "completado") {
    return NextResponse.json(
      { error: "El proceso completado no se puede modificar" },
      { status: 409 }
    );
  }

  const nextEstado =
    body.estado !== undefined ? String(body.estado) : current.estado;

  if (!VALID_ESTADOS.has(nextEstado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  if (
    nextEstado !== current.estado &&
    !PROCESS_TRANSITIONS[current.estado]?.includes(nextEstado)
  ) {
    return NextResponse.json(
      { error: `Transición inválida: ${current.estado} -> ${nextEstado}` },
      { status: 409 }
    );
  }

  const fechaInicio =
    body.fechaInicio !== undefined
      ? body.fechaInicio
        ? new Date(body.fechaInicio)
        : null
      : undefined;
  const fechaFin =
    body.fechaFin !== undefined
      ? body.fechaFin
        ? new Date(body.fechaFin)
        : null
      : undefined;

  if (fechaInicio instanceof Date && Number.isNaN(fechaInicio.getTime())) {
    return NextResponse.json({ error: "fechaInicio inválida" }, { status: 400 });
  }
  if (fechaFin instanceof Date && Number.isNaN(fechaFin.getTime())) {
    return NextResponse.json({ error: "fechaFin inválida" }, { status: 400 });
  }

  const transitionAt =
    nextEstado === "en_curso"
      ? fechaInicio ?? current.fechaInicio ?? new Date()
      : nextEstado === "completado" || nextEstado === "cancelado"
        ? fechaFin ?? current.fechaFin ?? new Date()
        : undefined;

  const updateData: Record<string, unknown> = {};
  if (body.estado !== undefined) updateData.estado = nextEstado;
  if (body.notas !== undefined) updateData.notas = body.notas;
  if (fechaInicio !== undefined) updateData.fechaInicio = fechaInicio;
  if (fechaFin !== undefined) updateData.fechaFin = fechaFin;
  if (nextEstado === "en_curso" && transitionAt) {
    updateData.fechaInicio = transitionAt;
  }
  if ((nextEstado === "completado" || nextEstado === "cancelado") && transitionAt) {
    updateData.fechaFin = transitionAt;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db.transaction(async (tx) => {
    const [updatedProceso] = await tx
      .update(proceso)
      .set(updateData)
      .where(eq(proceso.id, procesoId))
      .returning();

    if (!updatedProceso) return [];

    if (nextEstado === "en_curso" && transitionAt) {
      const startedServicios = await tx
        .update(servicio)
        .set({
          estado: "en_curso",
          fechaInicio: transitionAt,
        })
        .where(
          and(
            eq(servicio.procesoId, procesoId),
            eq(servicio.estado, "planificado")
          )
        )
        .returning({ id: servicio.id });

      const startedIds = startedServicios.map((s) => s.id);
      if (startedIds.length > 0) {
        await tx
          .update(dispositivoServicio)
          .set({ fechaInicio: transitionAt })
          .where(
            and(
              inArray(dispositivoServicio.servicioId, startedIds),
              isNull(dispositivoServicio.fechaInicio),
              isNull(dispositivoServicio.fechaTermino)
            )
          );
      }
    }

    if ((nextEstado === "completado" || nextEstado === "cancelado") && transitionAt) {
      const serviceRows = await tx
        .select({ id: servicio.id })
        .from(servicio)
        .where(eq(servicio.procesoId, procesoId));
      const serviceIds = serviceRows.map((s) => s.id);

      if (serviceIds.length > 0) {
        await tx
          .update(servicio)
          .set({
            estado: nextEstado,
            fechaInicio: sql`COALESCE(${servicio.fechaInicio}, ${transitionAt})`,
            fechaFin: transitionAt,
          })
          .where(
            and(
              inArray(servicio.id, serviceIds),
              sql`${servicio.estado} NOT IN ('completado', 'cancelado')`
            )
          );

        await tx
          .update(dispositivoServicio)
          .set({
            fechaInicio: sql`COALESCE(${dispositivoServicio.fechaInicio}, ${transitionAt})`,
            fechaTermino: transitionAt,
          })
          .where(
            and(
              inArray(dispositivoServicio.servicioId, serviceIds),
              isNull(dispositivoServicio.fechaTermino)
            )
          );
      }
    }

    return [updatedProceso];
  });

  if (!updated) {
    return NextResponse.json({ error: "Proceso no encontrado" }, { status: 404 });
  }

  // Notify empresa admins and super admins when a proceso is completed
  if (current.estado !== "completado" && nextEstado === "completado") {
    try {
      const [empresaRow, empresaAdmins, superAdmins] = await Promise.all([
        db.query.empresa.findFirst({ where: eq(empresa.id, updated.empresaId) }),
        db
          .select({ correo: usuario.correo, nombre: usuario.nombre })
          .from(empresaUsuario)
          .innerJoin(usuario, eq(empresaUsuario.usuarioId, usuario.id))
          .where(
            and(
              eq(empresaUsuario.empresaId, updated.empresaId),
              eq(empresaUsuario.rol, "administrador")
            )
          ),
        db
          .select({ correo: usuario.correo, nombre: usuario.nombre })
          .from(usuario)
          .where(eq(usuario.isSuperAdmin, true)),
      ]);

      const nombreEmpresa = empresaRow?.nombre ?? updated.empresaId;
      const nombreProceso = updated.temporada
        ? `Proceso ${updated.temporada}`
        : `Proceso ${updated.id.slice(0, 8)}`;
      const fechaCompletado = (transitionAt ?? new Date()).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Merge and deduplicate by correo
      const seenCorreos = new Set<string>();
      const recipients = [...empresaAdmins, ...superAdmins].filter(({ correo }) => {
        if (seenCorreos.has(correo)) return false;
        seenCorreos.add(correo);
        return true;
      });

      await Promise.allSettled(
        recipients.map((admin) =>
          sendEmail({
            to: admin.correo,
            subject: `Proceso completado: ${nombreProceso}`,
            react: React.createElement(ProcessCompletedEmail, {
              nombreAdmin: admin.nombre,
              nombreProceso,
              nombreEmpresa,
              fechaCompletado,
              notas: updated.notas ?? undefined,
            }),
          })
        )
      );
    } catch (emailError) {
      console.error("[PATCH proceso] Error enviando notificaciones:", emailError);
    }
  }

  return NextResponse.json(updated);
}
