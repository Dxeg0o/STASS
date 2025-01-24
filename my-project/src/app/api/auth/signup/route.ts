import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/user";
import { connectDb } from "@/lib/mongodb";
import mongoose from "mongoose";

// Conexión a la base de datos
connectDb();

export const POST = async (req: Request) => {
  try {
    const body = await req.json();
    const { nombre, correo, contraseña, empresaId } = body;

    // Verifica si el usuario ya existe
    const existingUser = await User.findOne({ correo });
    if (existingUser) {
      return NextResponse.json(
        { error: "El correo ya está registrado" },
        { status: 409 }
      );
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    // Crear el usuario
    const user = new User({
      _id: new mongoose.Types.ObjectId().toString(),
      nombre,
      correo,
      contraseña: hashedPassword,
      empresaId,
      rol: "usuario",
      fechaRegistro: new Date(),
    });

    await user.save();

    return NextResponse.json(
      { message: "Usuario creado exitosamente", userId: user._id },
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
