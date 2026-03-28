import { NextResponse } from "next/server";
import { db } from "@/db";
import { usuario } from "@/db/schema";
import { verifyAdmin } from "@/lib/auth";
import bcrypt from "bcrypt";

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usuarios = await db.query.usuario.findMany({
      with: {
        empresaUsuarios: {
          with: { empresa: true },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const sanitized = usuarios.map(({ password: _pw, ...rest }) => rest);

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Error fetching usuarios:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { nombre, correo, password, isSuperAdmin } = await req.json();

    if (!nombre || !correo || !password) {
      return NextResponse.json(
        { error: "nombre, correo, and password are required" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUsuario] = await db
      .insert(usuario)
      .values({
        nombre,
        correo,
        password: hashedPassword,
        isSuperAdmin: isSuperAdmin ?? false,
      })
      .returning();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...sanitized } = newUsuario;

    return NextResponse.json(sanitized, { status: 201 });
  } catch (error) {
    console.error("Error creating usuario:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
