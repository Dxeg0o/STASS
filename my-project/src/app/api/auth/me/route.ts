import { NextResponse } from "next/server";
import * as jose from "jose";
import { db } from "@/db";
import { usuario, empresa, servicio } from "@/db/schema";
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
    const empresaId = eu?.empresaId ?? null;

    // Fetch empresa name and service types
    let empresaNombre: string | null = null;
    let serviceTypes: string[] = [];

    if (empresaId) {
      const [emp] = await db
        .select({ nombre: empresa.nombre })
        .from(empresa)
        .where(eq(empresa.id, empresaId));
      empresaNombre = emp?.nombre ?? null;

      const types = await db
        .selectDistinct({ tipo: servicio.tipo })
        .from(servicio)
        .where(eq(servicio.empresaId, empresaId));
      serviceTypes = types.map((t) => t.tipo);
    }

    return NextResponse.json({
      id: user.id,
      name: user.nombre,
      mail: user.correo,
      empresaId,
      empresaNombre,
      serviceTypes,
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
