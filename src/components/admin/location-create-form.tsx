"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { BuildingFloorFields } from "@/components/admin/building-floor-fields";
import { createLocation } from "@/server/actions/locations";

type Building = { id: string; name: string };
type Floor = { id: string; number: number; buildingId: string; building: { name: string } };
type Result = { success?: string; error?: string } | null;
const types = [{ value: "POSTER", label: "Афиши" }, { value: "PRISM", label: "Призмы" }, { value: "BANNER", label: "Баннеры" }, { value: "TELEVISION", label: "Телевизор" }, { value: "LED_DISPLAY", label: "LED-дисплей" }];
const dark = "mt-2 w-full rounded-xl border border-white/30 bg-[#080c18]/85 p-3 text-white placeholder:text-slate-400";

export function LocationCreateForm({ buildings, floors }: { buildings: Building[]; floors: Floor[] }) {
  const [state, action, pending] = useActionState<Result, FormData>(createLocation, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  return <form action={action} className="mt-8 space-y-5"><label className="block text-lg font-bold text-white">Название точки *<input name="name" required placeholder="Например, вход в корпус" className={dark} /></label><label className="block text-lg font-bold text-white">Тип места *<select name="type" required value={selectedType} onChange={(event) => setSelectedType(event.target.value)} className={dark}><option value="" disabled>— Выберите —</option>{types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><BuildingFloorFields buildings={buildings} floors={floors} dark /><label className="block text-lg font-bold text-white">Описание / как пройти *<textarea name="description" required rows={5} placeholder="Подробно опишите расположение..." className={dark} /></label><div><label className="block text-lg font-bold text-white">Фотография места *</label><label className="mt-2 flex min-h-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/50 bg-[#080c18]/70 p-3 text-center text-white hover:border-blue-400">{preview ? <Image src={preview} alt="Предпросмотр фотографии" width={800} height={400} unoptimized className="max-h-52 rounded-xl object-contain" /> : <span>Нажмите, чтобы выбрать фото или открыть камеру</span>}<input name="photo" type="file" accept="image/*" capture="environment" required className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) setPreview(URL.createObjectURL(file)); }} /></label>{preview && <p className="mt-2 text-sm text-emerald-300">Фото добавлено и готово к сохранению.</p>}</div>{selectedType === "BANNER" ? <label className="block text-lg font-bold text-white">Вместимость *<input name="capacity" type="number" min="1" defaultValue="1" className={dark} /></label> : selectedType ? <input type="hidden" name="isUnlimitedCapacity" value="true" /> : null}{state?.error && <p role="alert" className="rounded-xl border border-rose-400 bg-rose-950/70 p-3 font-semibold text-rose-100">{state.error}</p>}{state?.success && <p role="status" className="rounded-xl border border-emerald-400 bg-emerald-950/70 p-3 font-semibold text-emerald-100">{state.success}</p>}<button disabled={pending} className="w-full rounded-2xl bg-blue-600 p-4 text-lg font-bold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">{pending ? "Сохраняем..." : "Сохранить в таблицу"}</button></form>;
}
