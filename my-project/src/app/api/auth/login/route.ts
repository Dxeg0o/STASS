import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import * as jose from "jose";
import validator from "validator";
import { db } from "@/db";
import { usuario, empresa } from "@/db/schema";
import { eq } from "drizzle-orm";

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
      { valid: validator.isEmail(email), errorMessage: "Email is invalid" },
      {
        valid: validator.isLength(password, { min: 1 }),
        errorMessage: "Password is invalid",
      },
    ];

    validationSchema.forEach((check) => {
      if (!check.valid) errors.push(check.errorMessage);
    });

    if (errors.length) {
      return NextResponse.json(
        { errorMessage: errors.join(", ") },
        { status: 400 }
      );
    }

    const user = await db.query.usuario.findFirst({
      where: eq(usuario.correo, email),
      with: { empresaUsuarios: true },
    });

    if (!user) {
      return NextResponse.json(
        { errorMessage: "Email or password is invalid" },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { errorMessage: "Email or password is invalid" },
        { status: 401 }
      );
    }

    const alg = "HS256";
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const token = await new jose.SignJWT({
      id: user.id,
      email: user.correo,
      isSuperAdmin: user.isSuperAdmin,
    })
      .setProtectedHeader({ alg })
      .setExpirationTime("24h")
      .sign(secret);

    // Fetch empresa names for all assignments
    const empresas = await Promise.all(
      user.empresaUsuarios.map(async (eu) => {
        const [emp] = await db
          .select({ nombre: empresa.nombre })
          .from(empresa)
          .where(eq(empresa.id, eu.empresaId));
        return {
          empresaId: eu.empresaId,
          empresaNombre: emp?.nombre ?? null,
          rol: eu.rol,
        };
      })
    );

    const response = NextResponse.json(
      {
        nombre: user.nombre,
        email: user.correo,
        userId: user.id,
        isSuperAdmin: user.isSuperAdmin,
        empresas,
      },
      { status: 200 }
    );
    response.cookies.set("token", token, {
      maxAge: 60 * 60 * 24,
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
