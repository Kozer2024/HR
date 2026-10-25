"use client";

import { useActionState } from "react";
import { createGroupBooking } from "@/server/actions/group-bookings";
import { PlacementBuilder } from "@/components/requests/placement-builder";

type Building = { id: string; name: string };
type Floor = { id: string; number: number; buildingId: string };
type Location = { id: string; name: string; buildingId: string; building: string; floorId: string; floor: number; type: string };
type Slot = { id: string; location: { name: string }; startAt: string; endAt: string };
type Result = { error?: string } | null;

export function GroupBookingForm({ buildings, floors, locations, slots }: { buildings: Building[]; floors: Floor[]; locations: Location[]; slots: Slot[] }) {
  const [state, action, pending] = useActionState<Result, FormData>(async (_previous, formData) => createGroupBooking(formData), null);
  return <form action={action} className="mt-8 space-y-6 rounded-2xl bg-white p-6 shadow-sm"><label className="block font-medium">Название запроса<input name="requestName" required minLength={2} maxLength={200} placeholder="Размещение на день открытых дверей" className="mt-1 w-full rounded-lg border p-3" /></label><PlacementBuilder buildings={buildings} floors={floors} locations={locations} />{slots.length > 0 && <fieldset><legend className="font-semibold">Слоты экранов</legend><div className="mt-3 grid gap-2">{slots.map((slot) => <label key={slot.id} className="flex items-center gap-3 rounded-lg border p-3"><input type="checkbox" name="screenSlotIds" value={slot.id} /><span>{slot.location.name} · {new Date(slot.startAt).toLocaleString("ru-RU")} — {new Date(slot.endAt).toLocaleString("ru-RU")}</span></label>)}</div></fieldset>}<div className="grid gap-4 sm:grid-cols-2"><label className="block font-medium">Первый день<input name="startDate" type="date" required className="mt-1 w-full rounded-lg border p-3" /></label><label className="block font-medium">Последний день<input name="endDate" type="date" required className="mt-1 w-full rounded-lg border p-3" /></label></div><label className="block font-medium">Комментарий и требования<textarea name="comment" rows={4} placeholder="Размеры, требования, нестандартные детали" className="mt-1 w-full rounded-lg border p-3" /></label>{state?.error && <p role="alert" className="rounded-lg border border-rose-400 bg-rose-50 p-4 font-semibold text-rose-950">{state.error}</p>}<button disabled={pending} className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white disabled:opacity-60">{pending ? "Отправляем..." : "Отправить один запрос на согласование"}</button></form>;
}
