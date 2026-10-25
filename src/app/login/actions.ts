"use server";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginAction(_previousState: { error?: string }, formData: FormData) {
  try {
    await signIn("credentials", { fullName: formData.get("fullName"), password: formData.get("password"), redirectTo: "/dashboard" });
    return {};
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) return { error: "Неверные ФИО или пароль. Возможно, учётная запись ещё не подтверждена администратором." };
    return { error: "Не удалось выполнить вход. Повторите попытку." };
  }
}
