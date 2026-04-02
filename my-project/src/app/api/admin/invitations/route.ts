import { NextResponse } from "next/server";
import { db } from "@/db";
import { invitationLink, empresa } from "@/db/schema";
import { verifyAdmin } from "@/lib/auth";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { InvitationEmail } from "@/emails/InvitationEmail";
import React from "react";

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitations = await db.query.invitationLink.findMany({
      with: { empresa: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    return NextResponse.json(invitations);
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
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { empresaId, rol, expiresAt, correoInvitado } = await req.json();

    if (!empresaId || !rol) {
      return NextResponse.json(
        { error: "empresaId and rol are required" },
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
        expiresAt: expiresAtDate,
        createdBy: admin.id,
      })
      .returning();

    if (correoInvitado) {
      try {
        const empresaRow = await db.query.empresa.findFirst({
          where: eq(empresa.id, empresaId),
        });

        const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?token=${token}`;
        const expiresLabel = expiresAtDate
          ? expiresAtDate.toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : "sin fecha de expiración";

        await sendEmail({
          to: correoInvitado,
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

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
