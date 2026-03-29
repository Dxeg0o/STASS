import { NextResponse } from "next/server";
import { db } from "@/db";
import { invitationLink } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invitationId } = await params;

    const [deleted] = await db
      .delete(invitationLink)
      .where(eq(invitationLink.id, invitationId))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Invitation deleted" });
  } catch (error) {
    console.error("Error deleting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
