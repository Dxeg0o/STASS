import * as jose from "jose";

interface TokenPayload {
  id: string;
  email: string;
  isSuperAdmin: boolean;
}

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export async function verifyToken(req: Request): Promise<TokenPayload | null> {
  try {
    const bearerToken = req.headers.get("authorization");
    if (!bearerToken) return null;

    const token = bearerToken.split(" ")[1];
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
