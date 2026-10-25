"use client";

import { useState } from "react";

type LocationOption = { id: string; type: string; floorId: string; floor: { number: number; buildingId: string; building: { name: string } } };
type FloorOption = { id: string; number: number; buildingId: string; building: { name: string } };
const typeLabels: Record<string, string> = { POSTER: "Афиши", PRISM: "Призмы", BANNER: "Баннеры", TELEVISION: "Телевизор", LED_DISPLAY: "LED-дисплей" };

export function CalendarFilters({ month, type, building, floor, locations, allFloors }: { month: string; type: string; building: string; floor: string; locations: LocationOption[]; allFloors: FloorOption[] }) {
  const [selectedType, setSelectedType] = useState(type);
  const [selectedBuilding, setSelectedBuilding] = useState(building);
  const [selectedFloor, setSelectedFloor] = useState(floor);
  const buildings = [...new Map(locations.filter((location) => selectedType === "ALL" || location.type === selectedType).map((location) => [location.floor.buildingId, location.floor.building.name])).entries()];
  const eligibleBuildingIds = new Set(buildings.map(([id]) => id));
  const floors = allFloors.filter((item) => eligibleBuildingIds.has(item.buildingId) && (!selectedBuilding || item.buildingId === selectedBuilding));

  return <form method="get" className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
    <label className="text-sm font-semibold">Месяц<input name="month" type="month" required defaultValue={month} className="mt-1 w-full rounded-lg border p-3" /></label>
    <label className="text-sm font-semibold">Тип продукции<select name="type" value={selectedType} onChange={(event) => { setSelectedType(event.target.value); setSelectedBuilding(""); setSelectedFloor(""); }} className="mt-1 w-full rounded-lg border p-3"><option value="ALL">Все типы</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="text-sm font-semibold">Корпус<select name="building" value={selectedBuilding} onChange={(event) => { setSelectedBuilding(event.target.value); setSelectedFloor(""); }} className="mt-1 w-full rounded-lg border p-3"><option value="">Все корпуса</option>{buildings.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    <label className="text-sm font-semibold">Этаж<select name="floor" value={selectedFloor} onChange={(event) => setSelectedFloor(event.target.value)} className="mt-1 w-full rounded-lg border p-3"><option value="">Все этажи</option>{floors.map((item) => <option key={item.id} value={item.id}>{selectedBuilding ? `Этаж ${item.number}` : `${item.building.name} · этаж ${item.number}`}</option>)}</select></label>
    <button className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white sm:col-span-2 lg:col-span-4">Показать</button>
  </form>;
}
