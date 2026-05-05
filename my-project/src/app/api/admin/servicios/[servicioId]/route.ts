import { NextResponse } from "next/server";
import { db } from "@/db";
import { dispositivoServicio, empresa, empresaUsuario, proceso, servicio, usuario } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import ServiceEndedEmail from "@/emails/ServiceEndedEmail";
import React from "react";

const SERVICE_TRANSITIONS: Record<string, string[]> = {
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ servicioId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { servicioId } = await params;
    const body = await req.json().catch(() => ({}));
    const current = await db.query.servicio.findFirst({
      where: eq(servicio.id, servicioId),
    });

    if (!current) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    if (current.estado === "completado") {
      return NextResponse.json(
        { error: "El servicio completado no se puede modificar" },
        { status: 409 }
      );
    }

    const inferredEstado =
      body.estado !== undefined
        ? String(body.estado)
        : body.fechaFin !== undefined
          ? "completado"
          : current.estado;

    if (!VALID_ESTADOS.has(inferredEstado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    if (
      inferredEstado !== current.estado &&
      !SERVICE_TRANSITIONS[current.estado]?.includes(inferredEstado)
    ) {
      return NextResponse.json(
        { error: `Transición inválida: ${current.estado} -> ${inferredEstado}` },
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
      inferredEstado === "en_curso"
        ? fechaInicio ?? current.fechaInicio ?? new Date()
        : inferredEstado === "completado" || inferredEstado === "cancelado"
          ? fechaFin ?? current.fechaFin ?? new Date()
          : undefined;

    const updateData: Record<string, unknown> = {};
    if (body.estado !== undefined || inferredEstado !== current.estado) {
      updateData.estado = inferredEstado;
    }
    if (fechaInicio !== undefined) updateData.fechaInicio = fechaInicio;
    if (fechaFin !== undefined) updateData.fechaFin = fechaFin;
    if (inferredEstado === "en_curso" && transitionAt) {
      updateData.fechaInicio = transitionAt;
    }
    if ((inferredEstado === "completado" || inferredEstado === "cancelado") && transitionAt) {
      updateData.fechaInicio = sql`COALESCE(${servicio.fechaInicio}, ${transitionAt})`;
      updateData.fechaFin = transitionAt;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db.transaction(async (tx) => {
      const [updatedServicio] = await tx
        .update(servicio)
        .set(updateData)
        .where(eq(servicio.id, servicioId))
        .returning();

      if (!updatedServicio) return [];

      if (inferredEstado === "en_curso" && transitionAt) {
        await tx
          .update(dispositivoServicio)
          .set({ fechaInicio: transitionAt })
          .where(
            and(
              eq(dispositivoServicio.servicioId, servicioId),
              isNull(dispositivoServicio.fechaInicio),
              isNull(dispositivoServicio.fechaTermino)
            )
          );

        if (current.procesoId) {
          await tx
            .update(proceso)
            .set({
              estado: "en_curso",
              fechaInicio: sql`COALESCE(${proceso.fechaInicio}, ${transitionAt})`,
            })
            .where(
              and(
                eq(proceso.id, current.procesoId),
                eq(proceso.estado, "planificado")
              )
            );
        }
      }

      if ((inferredEstado === "completado" || inferredEstado === "cancelado") && transitionAt) {
        await tx
          .update(dispositivoServicio)
          .set({
            fechaInicio: sql`COALESCE(${dispositivoServicio.fechaInicio}, ${transitionAt})`,
            fechaTermino: transitionAt,
          })
          .where(
            and(
              eq(dispositivoServicio.servicioId, servicioId),
              isNull(dispositivoServicio.fechaTermino)
            )
          );
      }

      return [updatedServicio];
    });

    if (!updated) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    // Notify empresa admins and super admins
    if (current.estado !== "completado" && inferredEstado === "completado") {
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
        const fechaCierre = (transitionAt ?? new Date()).toLocaleDateString("es-CL", {
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
          recipients.map((recipient) =>
            sendEmail({
              to: recipient.correo,
              subject: `Servicio finalizado: ${updated.nombre}`,
              react: React.createElement(ServiceEndedEmail, {
                nombreAdmin: recipient.nombre,
                nombreServicio: updated.nombre,
                nombreEmpresa,
                tipoServicio: updated.tipo,
                fechaCierre,
              }),
            })
          )
        );
      } catch (emailError) {
        console.error("[PATCH admin servicio] Error enviando notificaciones:", emailError);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error terminating servicio:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
