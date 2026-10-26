import { createHmac, timingSafeEqual } from "node:crypto";

function sign(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return createHmac("sha256", secret).update(value).digest();
}

export function createRegistrationStatusToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${sign(payload).toString("base64url")}`;
}

export function verifyRegistrationStatusToken(token: string | null) {
  if (!token || token.length > 1024) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    const received = Buffer.from(signature, "base64url");
    const expected = sign(payload);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    const decoded: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof decoded !== "object" || decoded === null || !("userId" in decoded) || !("expiresAt" in decoded)) return null;
    const value = decoded as { userId?: unknown; expiresAt?: unknown };
    if (typeof value.userId !== "string" || typeof value.expiresAt !== "number" || value.expiresAt <= Date.now()) return null;
    return value.userId;
  } catch {
    return null;
  }
}
