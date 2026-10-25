"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { BuildingFloorFields } from "@/components/admin/building-floor-fields";
import { activateLocation, deactivateLocation, deleteLocation, updateLocation } from "@/server/actions/locations";

type FloorOption = { id: string; number: number; buildingId: string; building: { name: string } };
type BuildingOption = { id: string; name: string };
type LocationItem = {
  id: string; name: string; type: string; capacity: number | null; isUnlimitedCapacity: boolean;
  isActive: boolean; description: string | null; dimensions: string | null; photoUrls: string[];
  floorId: string; floor: { number: number; buildingId: string; building: { name: string; campus: { name: string } } };
};

const typeLabels: Record<string, string> = { POSTER: "Афиши", PRISM: "Призмы", BANNER: "Баннеры", TELEVISION: "Телевизор", LED_DISPLAY: "LED-дисплей" };

function LocationEditForm({ location, buildings, floors }: { location: LocationItem; buildings: BuildingOption[]; floors: FloorOption[] }) {
  const [selectedType, setSelectedType] = useState(location.type);
  return <AdminActionForm action={async (data) => updateLocation(data)}><div className="mt-4 grid gap-3 rounded-xl border border-slate-300 p-4 md:grid-cols-2"><input type="hidden" name="locationId" value={location.id} /><input name="name" required defaultValue={location.name} className="rounded-lg border border-slate-400 p-3" /><select name="type" required value={selectedType} onChange={(event) => setSelectedType(event.target.value)} className="rounded-lg border border-slate-400 p-3">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><BuildingFloorFields buildings={buildings} floors={floors} initialBuildingId={location.floor.buildingId} initialFloorId={location.floorId} />{selectedType === "BANNER" ? <label className="font-medium">Вместимость *<input name="capacity" type="number" min="1" required defaultValue={location.type === "BANNER" ? location.capacity ?? 1 : 1} className="mt-1 w-full rounded-lg border border-slate-400 p-3" /></label> : <input type="hidden" name="isUnlimitedCapacity" value="true" />}<input name="dimensions" defaultValue={location.dimensions ?? ""} placeholder="Размеры" className="rounded-lg border border-slate-400 p-3" /><textarea name="description" required defaultValue={location.description ?? ""} placeholder="Описание" className="rounded-lg border border-slate-400 p-3 md:col-span-2" /><label className="text-sm font-medium text-slate-700">Обновить/добавить фото<input name="photo" type="file" accept="image/*" className="mt-1 block w-full rounded-lg border border-slate-400 p-2" /></label><button className="rounded-lg bg-blue-800 p-3 font-semibold text-white md:col-span-2">Сохранить изменения</button></div></AdminActionForm>;
}

export function LocationsList({ locations, buildings, floors }: { locations: LocationItem[]; buildings: BuildingOption[]; floors: FloorOption[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [buildingId, setBuildingId] = useState("ALL");
  const [floorId, setFloorId] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [capacity, setCapacity] = useState("ALL");
  const [photo, setPhoto] = useState("ALL");
  const filteredFloors = floors.filter((floor) => buildingId === "ALL" || floor.buildingId === buildingId);
  const filteredLocations = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("ru-RU");
    return locations.filter((item) => {
      const searchable = [item.name, item.description ?? "", item.dimensions ?? "", item.floor.building.name, item.floor.building.campus.name, String(item.floor.number), typeLabels[item.type] ?? item.type, item.isUnlimitedCapacity ? "не ограничена" : String(item.capacity ?? "")].join(" ").toLocaleLowerCase("ru-RU");
      return (!term || searchable.includes(term)) && (type === "ALL" || item.type === type) && (buildingId === "ALL" || item.floor.buildingId === buildingId) && (floorId === "ALL" || item.floorId === floorId) && (status === "ALL" || (status === "ACTIVE" ? item.isActive : !item.isActive)) && (capacity === "ALL" || (capacity === "UNLIMITED" ? item.isUnlimitedCapacity : !item.isUnlimitedCapacity)) && (photo === "ALL" || (photo === "WITH" ? item.photoUrls.length > 0 : item.photoUrls.length === 0));
    });
  }, [locations, query, type, buildingId, floorId, status, capacity, photo]);

  function resetFilters() { setQuery(""); setType("ALL"); setBuildingId("ALL"); setFloorId("ALL"); setStatus("ALL"); setCapacity("ALL"); setPhoto("ALL"); }

  return <section className="mt-8 rounded-2xl bg-white text-slate-950 shadow-sm">
    <h2 className="border-b p-5 text-xl font-semibold">Все точки</h2>
    <div className="grid gap-3 border-b border-slate-200 p-5 sm:grid-cols-2 lg:grid-cols-3">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по названию, описанию, размерам…" aria-label="Поиск по всем характеристикам" className="rounded-lg border border-slate-400 p-3 sm:col-span-2 lg:col-span-3" />
      <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Тип точки" className="rounded-lg border border-slate-400 p-3"><option value="ALL">Все типы</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select value={buildingId} onChange={(event) => { setBuildingId(event.target.value); setFloorId("ALL"); }} aria-label="Корпус" className="rounded-lg border border-slate-400 p-3"><option value="ALL">Все корпуса</option>{buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select value={floorId} onChange={(event) => setFloorId(event.target.value)} aria-label="Этаж" className="rounded-lg border border-slate-400 p-3"><option value="ALL">Все этажи</option>{filteredFloors.map((item) => <option key={item.id} value={item.id}>Этаж {item.number}</option>)}</select>
      <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Статус точки" className="rounded-lg border border-slate-400 p-3"><option value="ALL">Любой статус</option><option value="ACTIVE">Активные</option><option value="INACTIVE">Неактивные</option></select>
      <select value={capacity} onChange={(event) => setCapacity(event.target.value)} aria-label="Вместимость" className="rounded-lg border border-slate-400 p-3"><option value="ALL">Любая вместимость</option><option value="UNLIMITED">Не ограничена</option><option value="LIMITED">Ограничена</option></select>
      <select value={photo} onChange={(event) => setPhoto(event.target.value)} aria-label="Фото" className="rounded-lg border border-slate-400 p-3"><option value="ALL">С фото и без фото</option><option value="WITH">С фото</option><option value="WITHOUT">Без фото</option></select>
      <div className="flex items-center justify-between gap-3 sm:col-span-2 lg:col-span-3"><span className="text-sm font-semibold text-slate-700">Найдено: {filteredLocations.length} из {locations.length}</span><button type="button" onClick={resetFilters} className="rounded-lg border-2 border-slate-500 px-4 py-2 font-semibold text-slate-900 hover:bg-slate-100">Сбросить фильтры</button></div>
    </div>
    <div className="divide-y divide-slate-200">{filteredLocations.map((location) => <div key={location.id} className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 flex-1 gap-4"><div className="relative flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-400 bg-slate-100 text-center text-xs font-medium text-slate-700">{location.photoUrls[0] ? <Image src={location.photoUrls[0]} alt={`Фото точки ${location.name}`} fill unoptimized className="object-cover" /> : <span>Фото не добавлено</span>}</div><div><p className="font-semibold">{location.name}</p><p className="text-sm text-slate-700">{location.floor.building.campus.name} · {location.floor.building.name} · этаж {location.floor.number} · {typeLabels[location.type] ?? location.type}</p><p className="mt-1 text-sm text-slate-700">{!location.isUnlimitedCapacity && location.capacity !== null ? `Вместимость: ${location.capacity} · ` : ""}{location.dimensions ? `Размеры: ${location.dimensions} · ` : ""}{location.isActive ? "Активна" : "Неактивна"}</p>{location.description && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{location.description}</p>}</div></div><div className="flex flex-wrap gap-2">{location.isActive ? <AdminActionForm action={async () => deactivateLocation(location.id)}><button className="rounded-lg border border-amber-500 px-3 py-2 text-sm font-semibold text-amber-950">Деактивировать</button></AdminActionForm> : <AdminActionForm action={async () => activateLocation(location.id)}><button className="rounded-lg border border-emerald-800 bg-emerald-800 px-3 py-2 text-sm font-semibold text-white">Активировать</button></AdminActionForm>}<AdminActionForm action={async () => deleteLocation(location.id)}><button className="rounded-lg border border-rose-800 bg-rose-800 px-3 py-2 text-sm font-semibold text-white">Удалить</button></AdminActionForm></div></div>
      <details className="mt-4"><summary className="cursor-pointer font-semibold text-blue-800 underline">Редактировать точку</summary><LocationEditForm location={location} buildings={buildings} floors={floors} /></details>
    </div>)}{filteredLocations.length === 0 && <p className="p-5 text-slate-700">Точки по выбранным характеристикам не найдены.</p>}</div>
  </section>;
}
