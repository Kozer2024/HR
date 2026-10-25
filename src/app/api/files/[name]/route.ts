import path from "node:path";
import { readFile } from "node:fs/promises";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { storageDirectory } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function contentType(name: string) {
  const extension = path.extname(name).toLowerCase();
  return ({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf" } as Record<string, string>)[extension] ?? "application/octet-stream";
}

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const session = await auth();
  const cookieStore = await cookies();
  const executorAccessId = cookieStore.get("executor_access")?.value;
  const executorAccess = executorAccessId ? await prisma.executorAccess.findFirst({ where: { id: executorAccessId, revokedAt: null, access: { revokedAt: null, expiresAt: { gt: new Date() } } }, select: { id: true } }) : null;
  const { name } = await context.params;
  const safeName = path.basename(name);
  const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(path.extname(safeName).toLowerCase());
  if (!session?.user && !executorAccess && !isImage) return new Response("Unauthorized", { status: 401 });
  try {
    const file = await readFile(path.join(storageDirectory, safeName));
    return new Response(file, { headers: { "Content-Type": contentType(safeName), "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Not found", { status: 404 }); }
}
