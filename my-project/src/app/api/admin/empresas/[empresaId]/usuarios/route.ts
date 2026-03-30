import { NextResponse } from "next/server";
import { db } from "@/db";
import { empresaUsuario } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { empresaId } = await params;

    const usuarios = await db.query.empresaUsuario.findMany({
      where: eq(empresaUsuario.empresaId, empresaId),
      with: { usuario: true },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error("Error fetching empresa usuarios:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { empresaId } = await params;
    const { usuarioId, rol } = await req.json();

    if (!usuarioId || !rol) {
      return NextResponse.json(
        { error: "usuarioId and rol are required" },
        { status: 400 }
      );
    }

    const [assignment] = await db
      .insert(empresaUsuario)
      .values({ usuarioId, empresaId, rol })
      .returning();

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Error assigning usuario to empresa:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { empresaId } = await params;
    const { usuarioId, rol } = await req.json();

    if (!usuarioId || !rol) {
      return NextResponse.json(
        { error: "usuarioId and rol are required" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(empresaUsuario)
      .set({ rol })
      .where(
        and(
          eq(empresaUsuario.empresaId, empresaId),
          eq(empresaUsuario.usuarioId, usuarioId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating usuario role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { empresaId } = await params;
    const { usuarioId } = await req.json();

    if (!usuarioId) {
      return NextResponse.json(
        { error: "usuarioId is required" },
        { status: 400 }
      );
    }

    const [removed] = await db
      .delete(empresaUsuario)
      .where(
        and(
          eq(empresaUsuario.empresaId, empresaId),
          eq(empresaUsuario.usuarioId, usuarioId)
        )
      )
      .returning();

    if (!removed) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Usuario removed from empresa" });
  } catch (error) {
    console.error("Error removing usuario from empresa:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
