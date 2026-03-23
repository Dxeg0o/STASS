import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { usuario, empresaUsuario } from "@/db/schema";
import { eq } from "drizzle-orm";

export const POST = async (req: Request) => {
  try {
    const body = await req.json();
    const { nombre, correo, contraseña, empresaId } = body;

    const existing = await db.query.usuario.findFirst({
      where: eq(usuario.correo, correo),
    });

    if (existing) {
      return NextResponse.json(
        { error: "El correo ya está registrado" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(contraseña, 10);

    const [newUser] = await db
      .insert(usuario)
      .values({ nombre, correo, password: hashedPassword })
      .returning({ id: usuario.id });

    if (empresaId) {
      await db
        .insert(empresaUsuario)
        .values({ usuarioId: newUser.id, empresaId, rol: "usuario" });
    }

    return NextResponse.json(
      { message: "Usuario creado exitosamente", userId: newUser.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error durante el registro:", error);
    return NextResponse.json(
      { error: "Error al crear el usuario" },
      { status: 400 }
    );
  }
};
