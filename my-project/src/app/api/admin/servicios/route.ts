import { NextResponse } from "next/server";
import { db } from "@/db";
import { verifyAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const servicios = await db.query.servicio.findMany({
      with: {
        empresa: true,
        proceso: { with: { tipoProceso: true } },
      },
    });

    return NextResponse.json(servicios);
  } catch (error) {
    console.error("Error fetching servicios:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
