import { NextResponse } from "next/server";
import { db } from "@/db";
import { invitationLink } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyEmpresaAdminFromPayload, verifyToken } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const actor = await verifyToken(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invitationId } = await params;

    const invitation = await db.query.invitationLink.findFirst({
      where: eq(invitationLink.id, invitationId),
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (!actor.isSuperAdmin) {
      const empresaAdmin = await verifyEmpresaAdminFromPayload(
        actor,
        invitation.empresaId
      );

      if (!empresaAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await db.delete(invitationLink).where(eq(invitationLink.id, invitationId));

    return NextResponse.json({ message: "Invitation deleted" });
  } catch (error) {
    console.error("Error deleting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
