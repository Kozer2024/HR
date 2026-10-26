import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageDirectory } from "@/lib/storage";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { detectImage, isPdf } from "@/lib/file-signatures";
import { isSameOriginRequest } from "@/lib/request-security";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "EXECUTOR") return Response.json({ error: "Загружать фотоотчёты могут только исполнители." }, { status: 403 });
  if (!isSameOriginRequest(request)) return Response.json({ error: "Недопустимый источник запроса." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_FILE_SIZE + 64 * 1024) return Response.json({ error: "Размер запроса превышает 10 МБ." }, { status: 413 });

  try {
    const formData = await request.formData();
    const taskId = String(formData.get("taskId") ?? "");
    const file = formData.get("file");
    if (!/^[a-z0-9_-]{1,64}$/i.test(taskId) || !(file instanceof File) || file.size === 0 || file.size > MAX_FILE_SIZE) return Response.json({ error: "Выберите допустимый файл размером до 10 МБ." }, { status: 400 });
    const task = await prisma.executionTask.findFirst({ where: { id: taskId, executorId: session.user.id, booking: { status: "APPROVED" } }, select: { id: true } });
    if (!task) return Response.json({ error: "Эта задача не назначена вашему аккаунту." }, { status: 403 });
    if (!(await consumeRateLimit(rateLimitKey("report-upload", session.user.id), 20, 24 * 60 * 60 * 1000))) return Response.json({ error: "Достигнут суточный лимит загрузок." }, { status: 429 });

    const data = Buffer.from(await file.arrayBuffer());
    const image = detectImage(data);
    const pdf = isPdf(data);
    if (!image && !pdf) return Response.json({ error: "Разрешены только настоящие изображения PNG, JPEG, GIF, WebP и PDF." }, { status: 415 });
    const extension = image?.extension ?? ".pdf";
    const storedName = `${crypto.randomUUID()}${extension}`;
    const reportUrl = `/api/files/${storedName}`;
    await mkdir(storageDirectory, { recursive: true });
    await writeFile(path.join(/* turbopackIgnore: true */ storageDirectory, storedName), data, { flag: "wx" });
    try {
      await prisma.executionTask.update({ where: { id: task.id }, data: { status: "SUBMITTED", reportUrl } });
    } catch (error) {
      await unlink(path.join(/* turbopackIgnore: true */ storageDirectory, storedName)).catch(() => undefined);
      throw error;
    }
    return Response.json({ url: reportUrl });
  } catch {
    return Response.json({ error: "Не удалось сохранить фотоотчёт." }, { status: 400 });
  }
}
