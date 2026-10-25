"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/login/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, {});
  return <><form className="mt-8 space-y-4" action={formAction}><label className="block font-medium">ФИО<input name="fullName" type="text" required minLength={2} autoComplete="name" placeholder="Иванов Иван Иванович" className="mt-1 w-full rounded-lg border p-3" /></label><label className="block font-medium">Пароль<input name="password" type="password" required minLength={8} autoComplete="current-password" className="mt-1 w-full rounded-lg border p-3" /></label>{state.error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-900">{state.error}</p>}<button disabled={pending} className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{pending ? "Проверяем…" : "Войти"}</button></form><Link className="mt-6 inline-block font-medium text-blue-800 underline" href="/register">Нет аккаунта? Зарегистрироваться</Link></>;
}
