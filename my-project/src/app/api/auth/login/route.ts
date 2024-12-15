import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/user";
import { connectDb } from "@/lib/mongodb";

const JWT_SECRET = "your-secret-key";

// Asegúrate de conectar la base de datos
connectDb();

export const POST = async (req: Request) => {
  try {
    const body = await req.json(); // Extrae el cuerpo de la solicitud
    const { email, password } = body;

    // Busca al usuario por correo
    const user = await User.findOne({ correo: email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verifica la contraseña
    const isMatch = await bcrypt.compare(password, user.contraseña);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Genera el token JWT
    const token = jwt.sign(
      { id: user._id, companyId: user.empresa_id },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    // Configura la cookie (ver cookies-next)
    const response = NextResponse.json({ message: "Login successful" });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600, // 1 hora
      sameSite: "strict",
    });

    return response;
  } catch (error) {
    console.error("Error during login:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 400 });
  }
};
