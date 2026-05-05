import { NextResponse } from "next/server";
import { db } from "@/db";
import { producto } from "@/db/schema";
import { verifyAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productos = await db.query.producto.findMany({
      with: {
        variedades: {
          with: {
            subvariedades: true,
          },
        },
      },
    });

    return NextResponse.json(productos);
  } catch (error) {
    console.error("Error fetching productos:", error);
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

    const { nombre } = await req.json();

    if (!nombre) {
      return NextResponse.json(
        { error: "nombre is required" },
        { status: 400 }
      );
    }

    const [newProducto] = await db
      .insert(producto)
      .values({ nombre })
      .returning();

    return NextResponse.json(newProducto, { status: 201 });
  } catch (error) {
    console.error("Error creating producto:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
