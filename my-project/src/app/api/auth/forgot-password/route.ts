import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { usuario } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { ResetPasswordEmail } from "@/emails/ResetPasswordEmail";
import React from "react";

export async function POST(req: NextRequest) {
  try {
    const { correo } = await req.json();

    if (!correo) {
      return NextResponse.json(
        { errorMessage: "El correo es requerido." },
        { status: 400 }
      );
    }

    const user = await db.query.usuario.findFirst({
      where: eq(usuario.correo, correo),
    });

    // Always respond 200 to avoid revealing whether the email exists
    if (!user) {
      return NextResponse.json({
        message: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
      });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await db
      .update(usuario)
      .set({ resetPasswordToken: token, resetPasswordExpiresAt: expiresAt })
      .where(eq(usuario.id, user.id));

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    await sendEmail({
      to: user.correo,
      subject: "Restablece tu contraseña",
      react: React.createElement(ResetPasswordEmail, {
        nombre: user.nombre,
        resetUrl,
      }),
    });

    return NextResponse.json({
      message: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
    });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json(
      { errorMessage: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
