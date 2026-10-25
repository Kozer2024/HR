"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { encryptExecutorToken } from "@/lib/executor-link-token";

const joinSchema = z.object({ token: z.string().min(32), name: z.string().trim().min(2).max(120), studyGroup: z.string().trim().min(2).max(40), telegram: z.string().trim().min(2).max(80) });
function digest(token: string) { return crypto.createHash("sha256").update(token).digest("hex"); }

export async function createExecutorLink(bookingGroupId: string) {
  const user = await requireUser();
  const booking = await prisma.booking.findFirst({ where: { bookingGroupId, requesterId: user.role === "ADMIN" ? undefined : user.id, status: "APPROVED" } });
  if (!booking) return { error: "Список установки не найден или ещё не одобрен." };
  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.installationAccessLink.create({ data: { bookingGroupId, tokenHash: digest(token), tokenCiphertext: encryptExecutorToken(token), createdById: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
  revalidatePath("/admin/install-links");
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? new URL(process.env.AUTH_URL ?? "http://localhost:3001").host;
  return { url: `${protocol}://${host}/install-access/${token}` };
}

export async function joinExecutor(formData: FormData) {
  const parsed = joinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Укажите ФИО, учебную группу и Telegram-тег." };
  const access = await prisma.installationAccessLink.findUnique({ where: { tokenHash: digest(parsed.data.token) } });
  if (!access || access.revokedAt || access.expiresAt < new Date()) return { error: "Ссылка недействительна или истекла." };
  const executor = await prisma.executor.create({ data: { name: parsed.data.name, studyGroup: parsed.data.studyGroup, telegram: parsed.data.telegram } });
  const granted = await prisma.executorAccess.create({ data: { executorId: executor.id, accessId: access.id } });
  const cookieStore = await cookies();
  cookieStore.set("executor_access", granted.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: access.expiresAt, path: "/" });
  redirect(`/install-access/${parsed.data.token}`);
}

export async function markExecutorInstallation(accessId: string, bookingId: string, completed: boolean) {
  const access = await prisma.executorAccess.findUnique({ where: { id: accessId }, include: { access: true, executor: true } });
  if (!access || access.revokedAt || access.access.revokedAt || access.access.expiresAt < new Date()) return { error: "Доступ недействителен или истёк." };
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { bookingGroupId: true, status: true } });
  if (!booking || booking.bookingGroupId !== access.access.bookingGroupId || booking.status !== "APPROVED") return { error: "Точка не входит в этот список установок." };
  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { installationProgress: completed ? 100 : 0, installationMarkedById: completed ? access.executorId : null, installationMarkedAt: completed ? new Date() : null } }),
    prisma.installationEvent.create({ data: { bookingId, action: completed ? "CHECKED" : "UNCHECKED", actorName: access.executor.name, actorType: "EXECUTOR" } }),
  ]);
  revalidatePath("/execution");
  revalidatePath("/installation");
  revalidatePath("/install-access/[token]", "page");
  return { success: true };
}

export async function updateExecutorTask(accessId: string, taskId: string, status: "IN_PROGRESS" | "SUBMITTED", comment?: string) {
  const access = await prisma.executorAccess.findUnique({ where: { id: accessId }, include: { access: true, executor: true } });
  if (!access || access.revokedAt || access.access.revokedAt || access.access.expiresAt < new Date()) return;
  const task = await prisma.executionTask.findUnique({ where: { id: taskId }, include: { booking: true } });
  if (!task || task.booking.bookingGroupId !== access.access.bookingGroupId) return;
  await prisma.$transaction([prisma.executionTask.update({ where: { id: taskId }, data: { status, comment: comment?.trim() || undefined } }), ...(comment?.trim() ? [prisma.installationComment.create({ data: { taskId, authorExecutorId: access.executorId, text: comment.trim() } })] : [])]);
  revalidatePath(`/install-access/${access.accessId}`);
}
