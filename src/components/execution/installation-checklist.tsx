"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateInstallationProgress } from "@/server/actions/execution";
import { PhotoLightbox } from "@/components/locations/photo-lightbox";

type Item = {
  id: string;
  location: string;
  building: string;
  floor: number;
  campaign: string;
  start: string;
  end: string;
  objects: string[];
  comment: string | null;
  description: string | null;
  percent: number;
  markedBy: string | null;
  photoUrl: string | null;
  events: { action: "CHECKED" | "UNCHECKED"; actorName: string; actorType: string; createdAt: string }[];
};

type Group = { id: string; title: string; start: string; end: string; items: Item[] };

export function InstallationChecklist({ groups = [] }: { groups?: Group[] }) {
  // Be tolerant of stale/partial server payloads during dev-server refreshes.
  const safeGroups = Array.isArray(groups)
    ? groups.filter((group): group is Group => Boolean(group && Array.isArray(group.items)))
    : [];
  const items = safeGroups.flatMap((group) => group.items.filter(Boolean));
  const [checked, setChecked] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((item) => [item.id, item.percent >= 100])));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(item: Item, value: boolean) {
    const previous = checked[item.id] ?? false;
    setChecked((current) => ({ ...current, [item.id]: value }));
    setError("");
    startTransition(async () => {
      const result = await updateInstallationProgress(item.id, value);
      if (result?.error) {
        setChecked((current) => ({ ...current, [item.id]: previous }));
        setError(result.error);
      } else router.refresh();
    });
  }

  function download() {
    const lines = safeGroups.flatMap((group) => [`\n${group.title} | ${group.start}–${group.end}`, ...group.items.map((item) => `- [${checked[item.id] ? "x" : " "}] ${item.building}, этаж ${item.floor} — ${item.location} | ${item.objects.join(", ")}${item.comment ? ` | ${item.comment}` : ""}`)]);
    const url = URL.createObjectURL(new Blob([["План установок HR", ...lines].join("\n")], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "plan-ustanovok.txt"; link.click(); URL.revokeObjectURL(url);
  }

  const completed = items.filter((item) => checked[item.id]).length;
  const totalPercent = items.length ? Math.round((completed / items.length) * 100) : 0;

  return <section className="mt-6 rounded-2xl bg-white p-6 text-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">План установок</h2><p className="mt-1 text-sm text-slate-300">Запросы раскрываются отдельно. Точки внутри отсортированы по корпусам и сохраняют своё место при отметке.</p></div><button onClick={download} className="rounded-lg border-2 border-blue-400 px-3 py-2 font-semibold text-blue-100 hover:bg-slate-800">Скачать список</button></div>
    <div className="mt-5 rounded-xl border border-white/20 bg-slate-900 p-4"><div className="flex justify-between text-sm font-bold text-white"><span>Общий прогресс</span><span>{totalPercent}% ({completed} из {items.length})</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${totalPercent}%` }} /></div></div>
    {error && <p role="alert" className="mt-4 rounded-lg border-2 border-rose-400 bg-rose-950 p-3 text-sm font-bold text-rose-100">{error}</p>}
    <div className="mt-5 space-y-3">{safeGroups.map((group) => {
      const groupDone = group.items.filter((item) => checked[item.id]).length;
      return <details key={group.id} className="installation-request overflow-hidden rounded-xl border border-white/20 bg-slate-900/60">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4 font-semibold"><span>{group.title}<span className="ml-2 text-sm font-normal text-slate-300">{group.start} — {group.end}</span></span><span className="text-sm text-slate-300">{groupDone} из {group.items.length} установлено</span></summary>
        <div className="space-y-3 border-t border-white/15 p-3">{group.items.map((item) => {
          const done = !!checked[item.id];
          const percent = done ? 100 : 0;
          return <article key={item.id} className="installation-card flex gap-3 rounded-lg border border-white/20 bg-slate-950 p-4 text-white">
            <input id={`installation-${item.id}`} type="checkbox" checked={done} disabled={pending} onChange={(event) => toggle(item, event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-emerald-500" />
            <div className="installation-copy flex min-w-0 flex-1 gap-4 text-white">
              <span className="h-24 w-32 shrink-0">{item.photoUrl ? <PhotoLightbox src={item.photoUrl} alt={`Фото точки ${item.location}`} className="h-24 w-32 rounded-lg border border-slate-600 bg-slate-900" /> : <span className="flex h-24 w-32 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 p-2 text-center text-xs text-slate-300">Фото нет</span>}</span>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-3"><label htmlFor={`installation-${item.id}`} className="cursor-pointer font-bold text-white">{item.location}</label><span className="flex items-center gap-2"><strong className="text-blue-200">{percent}%</strong>{done && <strong className="rounded-full border border-emerald-600 bg-emerald-800 px-2 py-1 text-xs text-white">ВЫПОЛНЕНО</strong>}</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${percent}%` }} /></div>
                <p className="text-sm font-medium text-slate-200">{item.building} · этаж {item.floor} · {item.start} — {item.end}</p><p className="text-sm text-slate-200">{item.objects.join(", ") || "—"}</p>
                {item.description && <p className="mt-2 whitespace-pre-wrap rounded-md border border-white/15 bg-slate-900 p-2 text-sm text-slate-100"><strong>Описание точки:</strong> {item.description}</p>}
                {item.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200"><strong>Комментарий:</strong> {item.comment}</p>}
                {item.markedBy && <p className="mt-2 text-sm font-bold text-emerald-300">Текущую отметку поставил: {item.markedBy}</p>}
                {item.events.length > 0 && <details className="installation-history mt-3 rounded-lg border p-3"><summary className="installation-history-title cursor-pointer text-sm font-semibold">История изменений ({item.events.length})</summary><ol className="mt-2 space-y-2">{item.events.map((event, index) => <li key={`${event.createdAt}-${index}`} className="installation-history-event text-sm"><strong>{event.action === "CHECKED" ? "Поставил галочку" : "Снял галочку"}:</strong> {event.actorName} ({event.actorType === "ADMIN" ? "администратор" : event.actorType === "EXECUTOR" ? "исполнитель" : "организатор"}) · {new Date(event.createdAt).toLocaleString("ru-RU")}</li>)}</ol></details>}
              </div>
            </div>
          </article>;
        })}</div>
      </details>;
    })}</div>
    {items.length === 0 && <p className="mt-4 text-slate-300">После одобрения заявки точки появятся здесь.</p>}
  </section>;
}
