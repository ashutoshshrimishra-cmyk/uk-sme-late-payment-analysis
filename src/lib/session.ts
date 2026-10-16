import { jwtVerify, SignJWT } from "jose";
import { isRole, type Role } from "@/lib/roles";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getSessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required");
  }

  const key = new TextEncoder().encode(secret);
  if (key.byteLength < 32) {
    throw new Error("SESSION_SECRET must be at least 32 bytes");
  }

  return key;
}

export function assertSessionConfiguration(): void {
  getSessionKey();
}

export async function createSessionToken(role: Role): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionKey());
}

export async function readSessionToken(token?: string | null): Promise<Role | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionKey(), {
      algorithms: ["HS256"],
    });
    return isRole(payload.role) ? payload.role : null;
  } catch {
    return null;
  }
}
