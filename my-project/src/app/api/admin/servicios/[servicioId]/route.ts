import { NextResponse } from "next/server";
import { db } from "@/db";
import { servicio, empresa, empresaUsuario, usuario } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import ServiceEndedEmail from "@/emails/ServiceEndedEmail";
import React from "react";

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
    const fechaFin = body.fechaFin ? new Date(body.fechaFin) : new Date();

    const [updated] = await db
      .update(servicio)
      .set({ fechaFin })
      .where(eq(servicio.id, servicioId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    // Notify empresa admins and super admins
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
      const fechaCierre = fechaFin.toLocaleDateString("es-CL", {
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error terminating servicio:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
