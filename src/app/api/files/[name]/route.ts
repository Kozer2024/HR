import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { storageDirectory } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { isDriveStoredName, readDriveFile } from "@/lib/drive-storage";

export const runtime = "nodejs";

function contentType(name: string) {
  const extension = path.extname(name).toLowerCase();
  return ({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf" } as Record<string, string>)[extension] ?? "application/octet-stream";
}

function validStoredName(name: string) {
  return path.basename(name) === name && (/^[a-f0-9-]{36}(?:-[a-zA-Z0-9а-яА-Я._-]+)?\.(?:png|jpe?g|webp|gif|pdf)$/i.test(name) || isDriveStoredName(name));
}

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  if (!validStoredName(name)) return new Response("Not found", { status: 404 });
  const fileUrl = `/api/files/${name}`;
  const image = /\.(?:png|jpe?g|webp|gif)$/i.test(name);
  const [session, cookieStore, publicPhoto] = await Promise.all([
    auth(),
    cookies(),
    image ? prisma.location.findFirst({ where: { photoUrls: { has: fileUrl } }, select: { id: true } }) : Promise.resolve(null),
  ]);

  if (!publicPhoto) {
    const task = await prisma.executionTask.findFirst({ where: { reportUrl: fileUrl }, select: { executorId: true, booking: { select: { bookingGroupId: true } } } });
    if (!task?.booking.bookingGroupId) return new Response("Not found", { status: 404 });
    const ownTask = session?.user?.id === task.executorId;
    const isAdmin = session?.user?.role === "ADMIN";
    const accessId = cookieStore.get("executor_access")?.value;
    const executorAccess = accessId ? await prisma.executorAccess.findFirst({ where: { id: accessId, revokedAt: null, access: { bookingGroupId: task.booking.bookingGroupId, revokedAt: null, expiresAt: { gt: new Date() } } }, select: { id: true } }) : null;
    if (!ownTask && !isAdmin && !executorAccess) return new Response("Unauthorized", { status: 401 });
  }

  try {
    let file: Buffer;
    if (isDriveStoredName(name)) {
      file = await readDriveFile(name);
    } else {
      const filePath = path.join(storageDirectory, name);
      const metadata = await stat(filePath);
      if (!metadata.isFile() || metadata.size > 20 * 1024 * 1024) return new Response("Not found", { status: 404 });
      file = await readFile(filePath);
    }
    const headers = new Headers({ "Content-Type": contentType(name), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": image ? "inline" : "attachment" });
    return new Response(new Uint8Array(file), { headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
