import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db";
import { usuario, empresaUsuario } from "@/db/schema";
import bcrypt from "bcryptjs";

export async function GET() {
  const users = await db.query.usuario.findMany({
    with: { empresaUsuarios: true },
  });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  const hashedPassword = await bcrypt.hash(data.contraseña ?? data.password, 10);

  const [newUser] = await db
    .insert(usuario)
    .values({
      nombre: data.nombre,
      correo: data.correo,
      password: hashedPassword,
    })
    .returning();

  if (data.empresaId) {
    await db.insert(empresaUsuario).values({
      usuarioId: newUser.id,
      empresaId: data.empresaId,
      rol: data.rol ?? "usuario",
    });
  }

  return NextResponse.json(newUser);
}
