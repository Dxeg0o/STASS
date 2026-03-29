import { NextResponse } from "next/server";
import { db } from "@/db";
import { invitationLink } from "@/db/schema";
import { verifyAdmin } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitations = await db.query.invitationLink.findMany({
      with: { empresa: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
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

    const { empresaId, rol, expiresAt } = await req.json();

    if (!empresaId || !rol) {
      return NextResponse.json(
        { error: "empresaId and rol are required" },
        { status: 400 }
      );
    }

    const token = randomUUID();

    const [invitation] = await db
      .insert(invitationLink)
      .values({
        token,
        empresaId,
        rol,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: admin.id,
      })
      .returning();

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
