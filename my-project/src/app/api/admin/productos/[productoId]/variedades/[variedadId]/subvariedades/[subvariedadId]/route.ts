import { NextResponse } from "next/server";
import { db } from "@/db";
import { subvariedad, variedad } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      productoId: string;
      variedadId: string;
      subvariedadId: string;
    }>;
  }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productoId, variedadId, subvariedadId } = await params;

    const [parentVariedad] = await db
      .select({ id: variedad.id })
      .from(variedad)
      .where(
        and(eq(variedad.id, variedadId), eq(variedad.productoId, productoId))
      )
      .limit(1);

    if (!parentVariedad) {
      return NextResponse.json(
        { error: "Variedad not found" },
        { status: 404 }
      );
    }

    const [deleted] = await db
      .delete(subvariedad)
      .where(
        and(
          eq(subvariedad.id, subvariedadId),
          eq(subvariedad.variedadId, variedadId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Subvariedad not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Subvariedad deleted" });
  } catch (error) {
    console.error("Error deleting subvariedad:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
