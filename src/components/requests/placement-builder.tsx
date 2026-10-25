"use client";

import { useState } from "react";

type LocationOption = { id: string; name: string; buildingId: string; building: string; floorId: string; floor: number; type: string };
type BuildingOption = { id: string; name: string };
type FloorOption = { id: string; number: number; buildingId: string };

const productTypes = [
  { value: "POSTER", label: "Афиша" },
  { value: "PRISM", label: "Призма" },
  { value: "BANNER", label: "Баннер" },
  { value: "TELEVISION", label: "Телевизор" },
  { value: "LED_DISPLAY", label: "LED-дисплей" },
  { value: "CUSTOM", label: "Нестандартный объект" },
] as const;

type Placement = { object: string; buildingId: string; floorId: string; locationId: string; quantity: number };
const emptyPlacement = (): Placement => ({ object: "", buildingId: "", floorId: "", locationId: "", quantity: 1 });

export function PlacementBuilder({ locations, buildings, floors }: { locations: LocationOption[]; buildings: BuildingOption[]; floors: FloorOption[] }) {
  const [placements, setPlacements] = useState<Placement[]>([emptyPlacement()]);

  function update(index: number, changes: Partial<Placement>) {
    setPlacements((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  }

  return <fieldset>
    <legend className="font-semibold">Блоки размещения</legend>
    <p className="mt-1 text-sm text-slate-600">Добавьте по одному блоку для каждой продукции и точки. Все блоки уйдут администратору одним запросом.</p>
    <div className="mt-3 space-y-4">
      {placements.map((placement, index) => {
        const eligibleLocations = locations.filter((location) => placement.object === "CUSTOM" || !placement.object || location.type === placement.object);
        const availableBuildings = buildings.filter((building) => eligibleLocations.some((location) => location.buildingId === building.id));
        const availableFloors = floors.filter((floor) => floor.buildingId === placement.buildingId && eligibleLocations.some((location) => location.floorId === floor.id));
        const availableLocations = eligibleLocations.filter((location) => location.floorId === placement.floorId);

        return <section key={index} aria-label={`Блок размещения ${index + 1}`} className="rounded-xl border border-slate-300 p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">Блок {index + 1}</h3>{placements.length > 1 && <button type="button" aria-label={`Удалить блок ${index + 1}`} onClick={() => setPlacements((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-rose-300 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-50">Удалить</button>}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Тип продукции
              <select value={placement.object} onChange={(event) => update(index, { object: event.target.value, buildingId: "", floorId: "", locationId: "" })} required className="mt-1 w-full rounded-lg border p-3 font-normal"><option value="">Выберите тип</option>{productTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
            </label>
            <label className="text-sm font-semibold">Корпус
              <select value={placement.buildingId} onChange={(event) => update(index, { buildingId: event.target.value, floorId: "", locationId: "" })} required disabled={!placement.object} className="mt-1 w-full rounded-lg border p-3 font-normal disabled:bg-slate-100"><option value="">{placement.object ? "Выберите корпус" : "Сначала выберите тип продукции"}</option>{availableBuildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select>
            </label>
            <label className="text-sm font-semibold">Этаж
              <select value={placement.floorId} onChange={(event) => update(index, { floorId: event.target.value, locationId: "" })} required disabled={!placement.buildingId} className="mt-1 w-full rounded-lg border p-3 font-normal disabled:bg-slate-100"><option value="">{placement.buildingId ? "Выберите этаж" : "Сначала выберите корпус"}</option>{availableFloors.map((floor) => <option key={floor.id} value={floor.id}>Этаж {floor.number}</option>)}</select>
            </label>
            <label className="text-sm font-semibold">Конкретная точка
              <select value={placement.locationId} onChange={(event) => update(index, { locationId: event.target.value })} required disabled={!placement.floorId} className="mt-1 w-full rounded-lg border p-3 font-normal disabled:bg-slate-100"><option value="">{placement.floorId ? "Выберите точку" : "Сначала выберите этаж"}</option>{availableLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">Количество
              <input value={placement.quantity} onChange={(event) => update(index, { quantity: Number(event.target.value) })} type="number" min="1" required className="mt-1 w-full rounded-lg border p-3 font-normal sm:max-w-xs" />
            </label>
          </div>
        </section>;
      })}
    </div>
    <button type="button" onClick={() => setPlacements((current) => [...current, emptyPlacement()])} className="mt-3 rounded-lg border border-blue-700 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50">+ Добавить блок</button>
    <input type="hidden" name="placements" value={JSON.stringify(placements)} />
  </fieldset>;
}
