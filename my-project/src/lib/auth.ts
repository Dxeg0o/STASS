import * as jose from "jose";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { empresaUsuario } from "@/db/schema";

export interface TokenPayload {
  id: string;
  email: string;
  isSuperAdmin: boolean;
}

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

function getTokenFromCookieHeader(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const tokenCookie = cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith("token="));

  if (!tokenCookie) return null;
  return decodeURIComponent(tokenCookie.slice("token=".length));
}

export async function verifyToken(req: Request): Promise<TokenPayload | null> {
  try {
    const bearerToken = req.headers.get("authorization");
    const token =
      bearerToken?.startsWith("Bearer ")
        ? bearerToken.split(" ")[1]
        : getTokenFromCookieHeader(req);
    if (!token) return null;

    const { payload } = await jose.jwtVerify(token, getSecret());
    const { id, email, isSuperAdmin } = payload as unknown as TokenPayload;

    if (!id || !email) return null;
    return { id, email, isSuperAdmin: !!isSuperAdmin };
  } catch {
    return null;
  }
}

export async function verifyAdmin(req: Request): Promise<TokenPayload | null> {
  const payload = await verifyToken(req);
  if (!payload || !payload.isSuperAdmin) return null;
  return payload;
}

export async function verifyEmpresaAdminFromPayload(
  payload: TokenPayload | null,
  empresaId: string
): Promise<TokenPayload | null> {
  if (!payload) return null;
  if (payload.isSuperAdmin) return payload;

  const membership = await db.query.empresaUsuario.findFirst({
    where: and(
      eq(empresaUsuario.usuarioId, payload.id),
      eq(empresaUsuario.empresaId, empresaId),
      eq(empresaUsuario.rol, "administrador")
    ),
  });

  if (!membership) return null;
  return payload;
}

export async function verifyEmpresaAdmin(
  req: Request,
  empresaId: string
): Promise<TokenPayload | null> {
  const payload = await verifyToken(req);
  return verifyEmpresaAdminFromPayload(payload, empresaId);
}
