import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import User from "@/models/user";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDb();
  const { id } = params;
  const { nombre } = await req.json();

  if (!nombre) {
    return NextResponse.json(
      { errorMessage: "Nombre es requerido" },
      { status: 400 }
    );
  }

  const user = await User.findByIdAndUpdate(
    id,
    { nombre },
    { new: true }
  );

  if (!user) {
    return NextResponse.json(
      { errorMessage: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: user._id,
    name: user.nombre,
    email: user.correo,
    empresaId: user.empresaId,
    rol_usuario: user.rol,
  });
}
