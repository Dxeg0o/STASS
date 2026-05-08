import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { usuario } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { getAppBaseUrl } from "@/lib/app-url";
import ResetPasswordEmail from "@/emails/ResetPasswordEmail";
import React from "react";
import validator from "validator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail =
      typeof body.correo === "string"
        ? body.correo
        : typeof body.email === "string"
          ? body.email
          : "";
    const correo = rawEmail.trim().toLowerCase();

    if (!correo) {
      return NextResponse.json(
        { errorMessage: "El correo es requerido." },
        { status: 400 }
      );
    }

    if (!validator.isEmail(correo)) {
      return NextResponse.json(
        { errorMessage: "Ingresa un correo válido." },
        { status: 400 }
      );
    }

    const user = await db.query.usuario.findFirst({
      where: sql`lower(${usuario.correo}) = ${correo}`,
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

    const resetUrl = `${getAppBaseUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await sendEmail({
        to: user.correo,
        subject: "Restablece tu contraseña",
        react: React.createElement(ResetPasswordEmail, {
          nombre: user.nombre,
          resetUrl,
        }),
      });
    } catch (emailError) {
      console.error("[forgot-password] Error enviando correo:", emailError);
      return NextResponse.json(
        { errorMessage: "No pudimos enviar el correo de recuperación. Intenta nuevamente en unos minutos." },
        { status: 502 }
      );
    }

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
