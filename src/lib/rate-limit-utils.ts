import { createHmac } from "node:crypto";

export function requestAddress(headers: Headers) {
  const realIp = headers.get("x-real-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return realIp || forwarded || "unknown";
}

export function rateLimitKey(scope: string, identity: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return `${scope}:${createHmac("sha256", secret).update(identity.trim().toLowerCase()).digest("hex")}`;
}
