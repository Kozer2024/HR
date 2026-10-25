"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
const schema = z.object({ fullName: z.string().trim().min(2).max(100), studyGroup: z.string().trim().min(2).max(40), telegram: z.string().trim().max(80).optional(), telegramChatId: z.string().trim().max(80).optional() });
export async function saveProfile(formData: FormData) { const user = await requireUser(); const parsed = schema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return { error: "Проверьте ФИО и учебную группу." }; const duplicate = await prisma.user.findFirst({ where: { id: { not: user.id }, name: { equals: parsed.data.fullName, mode: "insensitive" } } }); if (duplicate) return { error: "Пользователь с таким ФИО уже существует." }; await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.fullName, studyGroup: parsed.data.studyGroup, telegramUsername: parsed.data.telegram || null, telegramChatId: parsed.data.telegramChatId || null } }); revalidatePath("/profile"); return { success: "Профиль сохранён." }; }
export async function saveTelegramChatId(formData: FormData) { const user = await requireUser(); const value = String(formData.get("telegramChatId") ?? "").trim(); await prisma.user.update({ where: { id: user.id }, data: { telegramChatId: value || null } }); revalidatePath("/profile"); }
