import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { connectDb } from "@/lib/mongodb";

// Define el esquema de usuario si no está definido en otra parte
const userSchema = new mongoose.Schema({
  id_usuario: { type: String, required: true },
  nombre: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  es_admin: { type: Boolean, required: true },
});

// Crear el modelo o usar uno existente
const User = mongoose.models.User || mongoose.model("User", userSchema);

export async function GET(req: Request) {
  try {
    await connectDb(); // Conexión a la base de datos

    const bearerToken = req.headers.get("authorization");

    if (!bearerToken) {
      return NextResponse.json(
        { errorMessage: "Authorization header missing" },
        { status: 401 }
      );
    }

    const token = bearerToken.split(" ")[1];
    const payload = jwt.verify(token, "hola");
    const { email } = payload as { email: string };

    if (!email) {
      return NextResponse.json(
        { errorMessage: "Unauthorized request (invalid email)" },
        { status: 401 }
      );
    }

    const user = await User.findOne({ correo: email });

    if (!user) {
      return NextResponse.json(
        { errorMessage: "User not found" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user._id,
      name: user.nombre,
      mail: user.correo,
    });
  } catch (error) {
    console.error("Invalid token:", error);
    return NextResponse.json(
      { errorMessage: "Unauthorized request (invalid token)" },
      { status: 401 }
    );
  }
}
