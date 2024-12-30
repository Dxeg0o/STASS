import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/models/user"; // Import the User model
import { connectDb } from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    await connectDb(); // Ensure database connection

    const bearerToken = req.headers.get("authorization");

    if (!bearerToken) {
      return NextResponse.json(
        { errorMessage: "Authorization header missing" },
        { status: 401 }
      );
    }

    const token = bearerToken.split(" ")[1];
    const payload = jwt.verify(token, "hola");
    const { email } = payload as { email: string };

    if (!email) {
      return NextResponse.json(
        { errorMessage: "Unauthorized request (invalid email)" },
        { status: 401 }
      );
    }

    const user = await User.findOne({ correo: email });
    if (!user) {
      return NextResponse.json(
        { errorMessage: "User not found" },
        { status: 401 }
      );
    }

    // Include `rol` as `rol_usuario` and other necessary fields
    return NextResponse.json({
      id: user._id,
      name: user.nombre,
      mail: user.correo,
      id_empresa: user.empresa_id,
      rol_usuario: user.rol,
    });
  } catch (error) {
    console.error("Invalid token:", error);
    return NextResponse.json(
      { errorMessage: "Unauthorized request (invalid token)" },
      { status: 401 }
    );
  }
}
