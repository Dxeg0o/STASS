import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { connectDb } from "@/lib/mongodb";

// Define the user schema if not already defined elsewhere
const userSchema = new mongoose.Schema({
  id_usuario: { type: String, required: true },
  nombre: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  es_admin: { type: Boolean, required: true },
});

// Create a model or use an existing one
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await connectDb(); // Ensure the database connection

    const bearerToken = req.headers["authorization"] as string;
    if (!bearerToken) {
      return res
        .status(401)
        .json({ errorMessage: "Authorization header missing" });
    }

    const token = bearerToken.split(" ")[1];
    const payload = jwt.decode(token) as { email: string };

    if (!payload || !payload.email) {
      return res
        .status(401)
        .json({ errorMessage: "Unauthorized request (invalid email)" });
    }

    const user = await User.findOne({ correo: payload.email });

    if (!user) {
      return res.status(401).json({ errorMessage: "User not found" });
    }

    return res.json({
      id: user._id,
      name: user.nombre,
      mail: user.correo,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ errorMessage: "Internal server error" });
  }
}
