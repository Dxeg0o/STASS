import { NextResponse } from "next/server";
import { db } from "@/db";
import { invitationLink } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await db.query.invitationLink.findFirst({
      where: eq(invitationLink.token, token),
      with: { empresa: true },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitacion no encontrada" },
        { status: 404 }
      );
    }

    if (invitation.usedAt) {
      return NextResponse.json(
        { error: "Esta invitacion ya fue utilizada" },
        { status: 410 }
      );
    }

    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Esta invitacion ha expirado" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      empresaId: invitation.empresaId,
      empresaNombre: invitation.empresa.nombre,
      rol: invitation.rol,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
