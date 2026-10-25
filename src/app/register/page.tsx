"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAfterApproval, registerUser } from "./actions";

export default function RegisterPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [watchingId, setWatchingId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ fullName: string; password: string } | null>(null);
  const isSuccess = message.startsWith("Заявка создана") || message.startsWith("Проверяем");

  useEffect(() => {
    if (!watchingId || !credentials) return;
    let stopped = false;
    const checkStatus = async () => {
      const response = await fetch(`/api/registration-status?userId=${encodeURIComponent(watchingId)}`, { cache: "no-store" });
      if (!response.ok || stopped) return;
      const result = await response.json() as { status?: string };
      if (result.status !== "ACTIVE") return;
      setMessage("Аккаунт подтверждён. Выполняем вход…");
      const login = await loginAfterApproval(credentials.fullName, credentials.password);
      if (stopped) return;
      if (login.ok) router.replace("/calendar");
      else { setWatchingId(null); setMessage("Аккаунт подтверждён. Перейдите на страницу входа."); }
    };
    void checkStatus();
    const timer = window.setInterval(() => void checkStatus(), 3000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [credentials, router, watchingId]);

  async function submit(formData: FormData) {
    const result = await registerUser(formData);
    if (result.error) { setMessage(result.error); return; }
    if (result.userId) {
      setCredentials({ fullName: String(formData.get("fullName") ?? ""), password: String(formData.get("password") ?? "") });
      setWatchingId(result.userId);
      setMessage("Заявка создана. Проверяем подтверждение администратора…");
    }
  }

  return <main className="mx-auto max-w-md p-8"><div className="rounded-2xl border border-white/20 bg-slate-950/85 p-6"><h1 className="text-3xl font-bold">Регистрация в PRoject</h1><p className="mt-2 text-slate-300">Введите ФИО, учебную группу и придумайте пароль. После подтверждения администратором вход выполнится автоматически.</p><form className="mt-8 space-y-4" action={submit}><label className="block font-medium">ФИО<input name="fullName" required minLength={2} maxLength={100} placeholder="Иванов Иван Иванович" className="mt-1 w-full rounded-lg border p-3" /></label><label className="block font-medium">Учебная группа<input name="studyGroup" required placeholder="ИУ7-31" className="mt-1 w-full rounded-lg border p-3" /></label><label className="block font-medium">Telegram-тег<input name="telegram" placeholder="@username" className="mt-1 w-full rounded-lg border p-3" /></label><label className="block font-medium">Пароль<input name="password" type="password" minLength={8} maxLength={128} required placeholder="Минимум 8 символов" className="mt-1 w-full rounded-lg border p-3" /></label>{message && <p role="status" className={`rounded-lg border p-4 text-sm font-semibold ${isSuccess ? "border-emerald-500 bg-emerald-50 text-emerald-950" : "border-rose-500 bg-rose-50 text-rose-950"}`}>{message}</p>}<button disabled={!!watchingId} className="w-full rounded-lg bg-[#1D74E8] p-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60">{watchingId ? "Ожидаем подтверждение…" : "Создать аккаунт"}</button></form><Link className="mt-6 inline-block font-medium text-blue-300 underline" href="/login">Уже есть аккаунт? Войти</Link></div></main>;
}
