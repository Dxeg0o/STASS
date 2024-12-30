import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import * as jose from "jose";
import validator from "validator";
import { connectDb } from "@/lib/mongodb";
import User from "@/models/user";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { errorMessage: "Email and password are required." },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    const validationSchema = [
      {
        valid: validator.isEmail(email),
        errorMessage: "Email is invalid",
      },
      {
        valid: validator.isLength(password, { min: 1 }),
        errorMessage: "Password is invalid",
      },
    ];

    validationSchema.forEach((check) => {
      if (!check.valid) {
        errors.push(check.errorMessage);
      }
    });

    if (errors.length) {
      return NextResponse.json(
        { errorMessage: errors.join(", ") },
        { status: 400 }
      );
    }

    const user = await User.findOne({ correo: email });
    if (!user) {
      return NextResponse.json(
        { errorMessage: "Email or password is invalid" },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.contraseña);
    if (!isMatch) {
      return NextResponse.json(
        { errorMessage: "Email or password is invalid" },
        { status: 401 }
      );
    }

    const alg = "HS256";
    const secret = new TextEncoder().encode("hola");
    const token = await new jose.SignJWT({ id: user._id, email: user.correo })
      .setProtectedHeader({ alg })
      .setExpirationTime("24h")
      .sign(secret);

    // Configurar la cookie en la respuesta
    const response = NextResponse.json(
      {
        nombre: user.nombre,
        email: user.correo,
        userId: user.id_usuario,
        id_empresa: user.id_empresa,
      },
      { status: 200 }
    );
    response.cookies.set("token", token, {
      maxAge: 60 * 60 * 24, // 24 horas
      //httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return response;
  } catch (error) {
    console.error("Error in login handler:", error);
    return NextResponse.json(
      { errorMessage: "Internal server error" },
      { status: 500 }
    );
  }
}
