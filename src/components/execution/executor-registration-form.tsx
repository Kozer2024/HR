"use client";

import { useActionState } from "react";
import { joinExecutor } from "@/server/actions/executor-access";

export function ExecutorRegistrationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<{ error?: string } | null, FormData>(async (_previous, formData) => joinExecutor(formData), null);
  return <form action={action} className="mt-6 space-y-4"><input type="hidden" name="token" value={token} /><label className="block font-medium">ФИО<input name="name" required minLength={2} className="mt-1 w-full rounded-lg border p-3" /></label><label className="block font-medium">Учебная группа<input name="studyGroup" required minLength={2} placeholder="ИУ7-31" className="mt-1 w-full rounded-lg border p-3" /></label><label className="block font-medium">Telegram-тег<input name="telegram" required minLength={2} placeholder="@username" className="mt-1 w-full rounded-lg border p-3" /></label>{state?.error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-rose-900">{state.error}</p>}<button disabled={pending} className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? "Регистрируем..." : "Открыть список установок"}</button></form>;
}
