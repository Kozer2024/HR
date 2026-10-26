import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createRegistrationStatusToken, verifyRegistrationStatusToken } from "../src/lib/registration-status-token";
import { detectImage, isPdf } from "../src/lib/file-signatures";
import { csvCell, toCsv } from "../src/lib/csv";
import { rateLimitKey } from "../src/lib/rate-limit-utils";
import { isSameOriginRequest } from "../src/lib/request-security";

process.env.AUTH_SECRET = "security-self-test-secret-with-more-than-thirty-two-characters";

test("registration status token accepts an intact, unexpired signature", () => {
  const token = createRegistrationStatusToken("usr_test_123");
  assert.equal(verifyRegistrationStatusToken(token), "usr_test_123");
});

test("registration status token rejects signature changes and malformed input", () => {
  const token = createRegistrationStatusToken("usr_test_123");
  assert.equal(verifyRegistrationStatusToken(`${token}x`), null);
  assert.equal(verifyRegistrationStatusToken("not-a-token"), null);
  assert.equal(verifyRegistrationStatusToken(null), null);
  assert.equal(verifyRegistrationStatusToken("x".repeat(1025)), null);
});

test("registration status token rejects expired payloads", () => {
  const payload = Buffer.from(JSON.stringify({ userId: "usr_test_123", expiresAt: Date.now() - 1 })).toString("base64url");
  const signature = createHmac("sha256", process.env.AUTH_SECRET!).update(payload).digest("base64url");
  assert.equal(verifyRegistrationStatusToken(`${payload}.${signature}`), null);
});

test("file signatures accept only the supported binary image and PDF headers", () => {
  assert.equal(detectImage(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))?.extension, ".png");
  assert.equal(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0x00]))?.extension, ".jpg");
  assert.equal(detectImage(Buffer.from("GIF89a"))?.extension, ".gif");
  assert.equal(detectImage(Buffer.from("RIFF0000WEBP"))?.extension, ".webp");
  assert.equal(isPdf(Buffer.from("%PDF-1.7")), true);
  assert.equal(detectImage(Buffer.from("<svg onload=alert(1)>")), null);
  assert.equal(detectImage(Buffer.alloc(0)), null);
  assert.equal(isPdf(Buffer.from("not a pdf")), false);
});

test("CSV output prevents spreadsheet formula execution and preserves quoting", () => {
  assert.equal(csvCell("=1+1"), "\"'=1+1\"");
  assert.equal(csvCell("  @SUM(A1:A2)"), "\"'  @SUM(A1:A2)\"");
  assert.equal(csvCell("name, \"quoted\""), "\"name, \"\"quoted\"\"\"");
  assert.match(toCsv([{ name: "-1+cmd|' /C calc'!A0" }]), /'-1\+cmd/);
});

test("rate limit keys conceal and scope their identities", () => {
  const first = rateLimitKey("login", "private name");
  assert.notEqual(first, rateLimitKey("login", "other name"));
  assert.notEqual(first, rateLimitKey("registration", "private name"));
  assert.equal(first.includes("private name"), false);
});

test("mutating API requests require a matching origin and forwarded host", () => {
  assert.equal(isSameOriginRequest(new Request("https://hr.example/api/files", { headers: { origin: "https://hr.example", host: "hr.example" } })), true);
  assert.equal(isSameOriginRequest(new Request("https://hr.example/api/files", { headers: { origin: "https://attacker.example", host: "hr.example" } })), false);
  assert.equal(isSameOriginRequest(new Request("https://hr.example/api/files", { headers: { host: "hr.example" } })), false);
  assert.equal(isSameOriginRequest(new Request("http://hr.example/api/files", { headers: { origin: "https://hr.example", host: "hr.example" } })), false);
});
