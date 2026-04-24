import { NextResponse } from "next/server";
import { db } from "@/db";
import { invitationLink, empresa } from "@/db/schema";
import {
  verifyEmpresaAdminFromPayload,
  verifyToken,
} from "@/lib/auth";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import InvitationEmail from "@/emails/InvitationEmail";
import React from "react";

export async function GET(req: Request) {
  try {
    const actor = await verifyToken(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const empresaId = searchParams.get("empresaId");

    if (!actor.isSuperAdmin) {
      if (!empresaId) {
        return NextResponse.json(
          { error: "empresaId es requerido para administradores de empresa" },
          { status: 400 }
        );
      }

      const empresaAdmin = await verifyEmpresaAdminFromPayload(actor, empresaId);
      if (!empresaAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const invitations = await db.query.invitationLink.findMany({
      where: empresaId ? eq(invitationLink.empresaId, empresaId) : undefined,
      with: { empresa: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    if (actor.isSuperAdmin) {
      return NextResponse.json(invitations);
    }

    return NextResponse.json(
      invitations.map((invitation) => {
        const { token: invitationToken, ...sanitizedInvitation } = invitation;
        void invitationToken;
        return sanitizedInvitation;
      })
    );
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await verifyToken(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { empresaId, rol, expiresAt, correoInvitado } = await req.json();
    const trimmedCorreoInvitado =
      typeof correoInvitado === "string" ? correoInvitado.trim() : "";

    if (!empresaId || !rol) {
      return NextResponse.json(
        { error: "empresaId and rol are required" },
        { status: 400 }
      );
    }

    if (!["usuario", "administrador"].includes(rol)) {
      return NextResponse.json(
        { error: "rol invalido" },
        { status: 400 }
      );
    }

    const authorizedActor = actor.isSuperAdmin
      ? actor
      : await verifyEmpresaAdminFromPayload(actor, empresaId);

    if (!authorizedActor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!actor.isSuperAdmin && !trimmedCorreoInvitado) {
      return NextResponse.json(
        { error: "correoInvitado es obligatorio para administradores de empresa" },
        { status: 400 }
      );
    }

    const token = randomUUID();
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

    const [invitation] = await db
      .insert(invitationLink)
      .values({
        token,
        empresaId,
        rol,
        correoInvitado: trimmedCorreoInvitado || null,
        expiresAt: expiresAtDate,
        createdBy: actor.id,
      })
      .returning();

    if (trimmedCorreoInvitado) {
      try {
        const empresaRow = await db.query.empresa.findFirst({
          where: eq(empresa.id, empresaId),
        });

        const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/registro-invitacion?token=${token}`;
        const expiresLabel = expiresAtDate
          ? expiresAtDate.toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : "sin fecha de expiración";

        await sendEmail({
          to: trimmedCorreoInvitado,
          subject: `Invitación a ${empresaRow?.nombre ?? "la plataforma"}`,
          react: React.createElement(InvitationEmail, {
            nombreEmpresa: empresaRow?.nombre ?? empresaId,
            rol,
            invitationUrl,
            expiresAt: expiresLabel,
          }),
        });
      } catch (emailError) {
        console.error("[POST invitations] Error enviando invitación:", emailError);
      }
    }

    if (actor.isSuperAdmin) {
      return NextResponse.json(invitation, { status: 201 });
    }

    const { token: invitationToken, ...sanitizedInvitation } = invitation;
    void invitationToken;
    return NextResponse.json(sanitizedInvitation, { status: 201 });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
