import { NextResponse } from "next/server";
import { db } from "@/db";
import { usuario } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";
import bcrypt from "bcrypt";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ usuarioId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { usuarioId } = await params;

    const result = await db.query.usuario.findFirst({
      where: eq(usuario.id, usuarioId),
      with: {
        empresaUsuarios: {
          with: { empresa: true },
        },
      },
    });

    if (!result) {
      return NextResponse.json(
        { error: "Usuario not found" },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...sanitized } = result;

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Error fetching usuario:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ usuarioId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { usuarioId } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.correo !== undefined) updateData.correo = body.correo;
    if (body.isSuperAdmin !== undefined)
      updateData.isSuperAdmin = body.isSuperAdmin;
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    const [updated] = await db
      .update(usuario)
      .set(updateData)
      .where(eq(usuario.id, usuarioId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Usuario not found" },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw2, ...sanitized } = updated;

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Error updating usuario:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ usuarioId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { usuarioId } = await params;

    const [deleted] = await db
      .delete(usuario)
      .where(eq(usuario.id, usuarioId))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Usuario not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Usuario deleted" });
  } catch (error) {
    console.error("Error deleting usuario:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
