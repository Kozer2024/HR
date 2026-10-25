"use server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
const schema = z.object({ fullName: z.string().trim().min(2).max(100), studyGroup: z.string().trim().min(2).max(40), telegram: z.string().trim().max(80).optional(), password: z.string().min(8).max(128) });
export async function registerUser(formData: FormData) { const result = schema.safeParse(Object.fromEntries(formData)); if (!result.success) return { error: "Введите ФИО, учебную группу и пароль длиной не менее 8 символов." }; const existing = await prisma.user.findFirst({ where: { name: { equals: result.data.fullName, mode: "insensitive" } } }); if (existing) return { error: "Пользователь с таким ФИО уже зарегистрирован." }; const user = await prisma.user.create({ data: { name: result.data.fullName, studyGroup: result.data.studyGroup, telegramUsername: result.data.telegram || null, email: `local-${crypto.randomUUID()}@pr-manager.local`, passwordHash: await hash(result.data.password, 12), role: "ORGANIZER", status: "PENDING" }, select: { id: true } }); return { success: "Заявка создана. Ожидаем подтверждение администратора…", userId: user.id }; }

export async function loginAfterApproval(fullName: string, password: string) { try { const result = await signIn("credentials", { fullName, password, redirect: false }); return { ok: !result?.error, error: result?.error }; } catch { return { ok: false, error: "Не удалось автоматически войти. Откройте страницу входа." }; } }
