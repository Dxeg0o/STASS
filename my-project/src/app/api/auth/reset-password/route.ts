import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/db";
import { usuario } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { errorMessage: "Token y nueva contraseña son requeridos." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { errorMessage: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    const user = await db.query.usuario.findFirst({
      where: and(
        eq(usuario.resetPasswordToken, token),
        gt(usuario.resetPasswordExpiresAt, new Date())
      ),
    });

    if (!user) {
      return NextResponse.json(
        { errorMessage: "El enlace es inválido o ha expirado." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .update(usuario)
      .set({
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      })
      .where(eq(usuario.id, user.id));

    return NextResponse.json({ message: "Contraseña actualizada correctamente." });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { errorMessage: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
