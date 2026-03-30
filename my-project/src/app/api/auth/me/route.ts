import { NextResponse } from "next/server";
import { db } from "@/db";
import { usuario, empresa, servicio } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const tokenPayload = await verifyToken(req);
    if (!tokenPayload) {
      return NextResponse.json(
        { errorMessage: "Unauthorized request" },
        { status: 401 }
      );
    }

    const user = await db.query.usuario.findFirst({
      where: eq(usuario.correo, tokenPayload.email),
      with: { empresaUsuarios: true },
    });

    if (!user) {
      return NextResponse.json(
        { errorMessage: "User not found" },
        { status: 401 }
      );
    }

    // Fetch all empresas with names
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

    // Check if a specific empresa is requested
    const url = new URL(req.url);
    const selectedEmpresaId = url.searchParams.get("empresaId");

    if (selectedEmpresaId) {
      // Validate access: user belongs to this empresa OR is super admin
      const hasAccess =
        user.isSuperAdmin ||
        user.empresaUsuarios.some((eu) => eu.empresaId === selectedEmpresaId);

      if (!hasAccess) {
        return NextResponse.json(
          { errorMessage: "No tienes acceso a esta empresa" },
          { status: 403 }
        );
      }

      // Get empresa details
      const [emp] = await db
        .select({ nombre: empresa.nombre })
        .from(empresa)
        .where(eq(empresa.id, selectedEmpresaId));

      // Get service types for this empresa
      const types = await db
        .selectDistinct({ tipo: servicio.tipo })
        .from(servicio)
        .where(eq(servicio.empresaId, selectedEmpresaId));

      // Get role for this empresa (super admin gets 'administrador')
      const euRecord = user.empresaUsuarios.find(
        (eu) => eu.empresaId === selectedEmpresaId
      );
      const rol = euRecord?.rol ?? (user.isSuperAdmin ? "administrador" : "usuario");

      return NextResponse.json({
        id: user.id,
        name: user.nombre,
        mail: user.correo,
        isSuperAdmin: user.isSuperAdmin,
        empresaId: selectedEmpresaId,
        empresaNombre: emp?.nombre ?? null,
        serviceTypes: types.map((t) => t.tipo),
        rol_usuario: rol,
        empresas,
      });
    }

    // No empresa selected — return user with all empresas
    return NextResponse.json({
      id: user.id,
      name: user.nombre,
      mail: user.correo,
      isSuperAdmin: user.isSuperAdmin,
      empresaId: null,
      empresaNombre: null,
      serviceTypes: [],
      rol_usuario: "usuario",
      empresas,
    });
  } catch (error) {
    console.error("Invalid token:", error);
    return NextResponse.json(
      { errorMessage: "Unauthorized request (invalid token)" },
      { status: 401 }
    );
  }
}
