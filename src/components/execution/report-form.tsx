"use client";

import { useState } from "react";

export function ReportForm({ taskId }: { taskId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setBusy(true);
    setMessage("");
    formData.set("taskId", taskId);
    try {
      const response = await fetch("/api/files", { method: "POST", body: formData });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) setMessage(result.error ?? "Ошибка загрузки.");
      else setMessage("Фотоотчёт загружен.");
    } catch {
      setMessage("Не удалось загрузить фотоотчёт. Проверьте соединение и повторите попытку.");
    } finally {
      setBusy(false);
    }
  }

  return <form action={submit} className="mt-4 space-y-2"><input name="file" type="file" accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" required className="block w-full text-sm" /><button disabled={busy} className="rounded bg-emerald-600 px-3 py-2 text-sm text-white">{busy ? "Загрузка…" : "Загрузить фотоотчёт"}</button>{message && <p role="status" className="text-xs text-slate-500">{message}</p>}</form>;
}
