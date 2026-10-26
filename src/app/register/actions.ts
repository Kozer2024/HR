"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { headers } from "next/headers";
import { consumeRateLimit, rateLimitKey, requestAddress } from "@/lib/rate-limit";
import { createRegistrationStatusToken } from "@/lib/registration-status-token";

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  studyGroup: z.string().trim().min(2).max(40),
  telegram: z.string().trim().max(80).optional(),
  password: z.string().min(8).max(128),
});

export async function registerUser(formData: FormData) {
  const address = requestAddress(await headers());
  if (!(await consumeRateLimit(rateLimitKey("registration-ip", address), 5, 60 * 60 * 1000))) {
    return { error: "Слишком много попыток регистрации. Попробуйте позже." };
  }

  const result = schema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { error: "Введите ФИО, учебную группу и пароль длиной не менее 8 символов." };
  const existing = await prisma.user.findFirst({ where: { name: { equals: result.data.fullName, mode: "insensitive" } }, select: { id: true } });
  if (existing) return { error: "Не удалось завершить регистрацию. Проверьте данные или обратитесь к администратору." };

  const user = await prisma.user.create({
    data: {
      name: result.data.fullName,
      studyGroup: result.data.studyGroup,
      telegramUsername: result.data.telegram || null,
      email: `local-${crypto.randomUUID()}@pr-manager.local`,
      passwordHash: await hash(result.data.password, 12),
      role: "ORGANIZER",
      status: "PENDING",
    },
    select: { id: true },
  });
  return { success: "Заявка создана. Ожидаем подтверждение администратора…", statusToken: createRegistrationStatusToken(user.id) };
}

export async function loginAfterApproval(fullName: string, password: string) {
  try {
    const result = await signIn("credentials", { fullName, password, redirect: false });
    return { ok: !result?.error, error: result?.error };
  } catch {
    return { ok: false, error: "Не удалось автоматически войти. Откройте страницу входа." };
  }
}
