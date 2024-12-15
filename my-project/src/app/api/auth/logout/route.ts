import { NextResponse } from "next/server";

export const POST = async () => {
  const response = NextResponse.json({ message: "Logged out successfully" });

  // Eliminar la cookie del token (ver cookie-next)
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0, // Expira inmediatamente
    sameSite: "strict",
  });

  return response;
};
