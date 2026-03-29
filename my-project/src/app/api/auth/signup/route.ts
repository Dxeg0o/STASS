import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { usuario, empresaUsuario, invitationLink } from "@/db/schema";
import { eq } from "drizzle-orm";

export const POST = async (req: Request) => {
  try {
    const body = await req.json();
    const { nombre, correo, contraseña, empresaId, invitationToken } = body;

    const existing = await db.query.usuario.findFirst({
      where: eq(usuario.correo, correo),
    });

    if (existing) {
      return NextResponse.json(
        { error: "El correo ya está registrado" },
        { status: 409 }
      );
    }

    // If using an invitation token, validate it
    let invEmpresaId = empresaId;
    let invRol = "usuario";
    let invitation: typeof invitationLink.$inferSelect | null = null;

    if (invitationToken) {
      const found = await db.query.invitationLink.findFirst({
        where: eq(invitationLink.token, invitationToken),
      });

      if (!found) {
        return NextResponse.json(
          { error: "Invitacion no encontrada" },
          { status: 404 }
        );
      }

      if (found.usedAt) {
        return NextResponse.json(
          { error: "Esta invitacion ya fue utilizada" },
          { status: 410 }
        );
      }

      if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: "Esta invitacion ha expirado" },
          { status: 410 }
        );
      }

      invitation = found;
      invEmpresaId = found.empresaId;
      invRol = found.rol;
    }

    const hashedPassword = await bcrypt.hash(contraseña, 10);

    const [newUser] = await db
      .insert(usuario)
      .values({ nombre, correo, password: hashedPassword })
      .returning({ id: usuario.id });

    if (invEmpresaId) {
      await db
        .insert(empresaUsuario)
        .values({ usuarioId: newUser.id, empresaId: invEmpresaId, rol: invRol });
    }

    // Mark invitation as used
    if (invitation) {
      await db
        .update(invitationLink)
        .set({ usedAt: new Date(), usedByUsuarioId: newUser.id })
        .where(eq(invitationLink.id, invitation.id));
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
