import { NextResponse } from "next/server";
import * as jose from "jose";
import { db } from "@/db";
import { usuario } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const bearerToken = req.headers.get("authorization");

    if (!bearerToken) {
      return NextResponse.json(
        { errorMessage: "Authorization header missing" },
        { status: 401 }
      );
    }

    const token = bearerToken.split(" ")[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jose.jwtVerify(token, secret);
    const { email } = payload as { email: string };

    if (!email) {
      return NextResponse.json(
        { errorMessage: "Unauthorized request (invalid email)" },
        { status: 401 }
      );
    }

    const user = await db.query.usuario.findFirst({
      where: eq(usuario.correo, email),
      with: { empresaUsuarios: { limit: 1 } },
    });

    if (!user) {
      return NextResponse.json(
        { errorMessage: "User not found" },
        { status: 401 }
      );
    }

    const eu = user.empresaUsuarios[0];

    return NextResponse.json({
      id: user.id,
      name: user.nombre,
      mail: user.correo,
      empresaId: eu?.empresaId ?? null,
      rol_usuario: eu?.rol ?? "usuario",
    });
  } catch (error) {
    console.error("Invalid token:", error);
    return NextResponse.json(
      { errorMessage: "Unauthorized request (invalid token)" },
      { status: 401 }
    );
  }
}
