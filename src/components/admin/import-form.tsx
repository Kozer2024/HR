"use client";

import { useRef, useState } from "react";

export function ImportForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);

  async function submit(formData: FormData, mode: "preview" | "import") {
    formData.set("mode", mode);
    setMessage(mode === "preview" ? "Проверка…" : "Импорт…");
    const response = await fetch("/api/admin/import", { method: "POST", body: formData });
    const result = await response.json() as { error?: string; total?: number; imported?: number; errors?: { row: number; message: string }[] };
    if (!response.ok) { setMessage(result.error ?? "Ошибка импорта"); return; }
    if (mode === "preview") { setPreview(true); setMessage(`Проверка завершена. Строк: ${result.total ?? 0}. Ошибок: ${result.errors?.length ?? 0}.`); }
    else { setPreview(false); setMessage(`Импорт завершён. Обработано точек: ${result.imported ?? 0}.`); }
  }

  return <main className="mx-auto max-w-4xl p-6 md:p-8"><h1 className="text-3xl font-bold">Импорт рекламных точек</h1><p className="mt-2 text-slate-300">Форматы Excel .xlsx и CSV: ID, кампус, корпус, этаж, название, тип (афиша, призма, баннер, телевизор или LED-дисплей), вместимость, описание, размеры, фото. Для фото приложите ZIP без вложенных путей.</p><form ref={formRef} className="mt-6 space-y-5 rounded-2xl bg-white p-6" onSubmit={(event) => { event.preventDefault(); void submit(new FormData(event.currentTarget), "preview"); }}><label className="block font-semibold">Excel-файл<input name="excel" type="file" accept=".xlsx,.csv" required className="mt-2 block w-full" /></label><label className="block font-semibold">ZIP фотографий<input name="photos" type="file" accept=".zip" className="mt-2 block w-full" /></label><button className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white">Проверить файл</button>{preview && <button type="button" onClick={() => { if (formRef.current) void submit(new FormData(formRef.current), "import"); }} className="ml-3 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white">Подтвердить импорт</button>}<p role="status" className="text-sm text-slate-600">{message}</p></form></main>;
}
