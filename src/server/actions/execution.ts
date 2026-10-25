"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/permissions";

export async function updateInstallationProgress(bookingId: string, completed: boolean) {
  const user = await requireUser();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { requesterId: true, status: true } });
  if (!booking || booking.status !== "APPROVED" || (user.role !== "ADMIN" && booking.requesterId !== user.id)) return { error: "Нет доступа к этой установке." };
  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { installationProgress: completed ? 100 : 0 } }),
    prisma.installationEvent.create({ data: { bookingId, action: completed ? "CHECKED" : "UNCHECKED", actorName: user.name, actorType: user.role } }),
  ]);
  revalidatePath("/execution");
  revalidatePath("/installation");
  return { success: true };
}

export async function assignExecutionTask(formData: FormData) { await requireRole("ADMIN"); const parsed = z.object({ bookingId: z.string().min(1), executorId: z.string().min(1) }).safeParse(Object.fromEntries(formData)); if (!parsed.success) return; await prisma.executionTask.upsert({ where: { bookingId: parsed.data.bookingId }, update: { executorId: parsed.data.executorId, status: "TODO" }, create: { bookingId: parsed.data.bookingId, executorId: parsed.data.executorId } }); revalidatePath("/execution"); }
export async function updateExecutionTask(taskId: string, status: "IN_PROGRESS" | "SUBMITTED" | "ACCEPTED" | "REJECTED", reportUrl?: string) { const user = await requireUser(); const task = await prisma.executionTask.findUnique({ where: { id: taskId } }); if (!task || (user.role !== "ADMIN" && task.executorId !== user.id)) return; await prisma.executionTask.update({ where: { id: taskId }, data: { status, ...(reportUrl ? { reportUrl } : {}) } }); revalidatePath("/execution"); }
