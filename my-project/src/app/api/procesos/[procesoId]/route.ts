import { NextResponse } from "next/server";
import { db } from "@/db";
import { proceso, empresa, empresaUsuario, usuario } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import ProcessCompletedEmail from "@/emails/ProcessCompletedEmail";
import React from "react";

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

  const updateData: Record<string, unknown> = {};
  if (body.estado !== undefined) updateData.estado = body.estado;
  if (body.fechaInicio !== undefined) updateData.fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : null;
  if (body.fechaFin !== undefined) updateData.fechaFin = body.fechaFin ? new Date(body.fechaFin) : null;
  if (body.notas !== undefined) updateData.notas = body.notas;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(proceso)
    .set(updateData)
    .where(eq(proceso.id, procesoId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Proceso no encontrado" }, { status: 404 });
  }

  // Notify empresa admins and super admins when a proceso is completed
  if (body.estado === "completado") {
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
      const fechaCompletado = new Date().toLocaleDateString("es-CL", {
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
