"use client";

import { useMemo, useState } from "react";

type Building = { id: string; name: string };
type Floor = { id: string; number: number; buildingId: string; building: { name: string } };

export function BuildingFloorFields({ buildings, floors, initialBuildingId = "", initialFloorId = "", dark = false }: { buildings: Building[]; floors: Floor[]; initialBuildingId?: string; initialFloorId?: string; dark?: boolean }) {
  const [buildingId, setBuildingId] = useState(initialBuildingId);
  const [floorId, setFloorId] = useState(initialFloorId);
  const availableFloors = useMemo(() => floors.filter((floor) => floor.buildingId === buildingId), [floors, buildingId]);
  const inputClass = dark ? "mt-2 w-full rounded-xl border border-white/30 bg-[#080c18]/85 p-3 text-white" : "rounded-lg border p-3";
  return <div className="grid gap-5 md:grid-cols-2"><label className={dark ? "block text-lg font-bold text-white" : "block font-medium"}>Корпус *<select name="buildingId" required value={buildingId} onChange={(event) => { setBuildingId(event.target.value); setFloorId(""); }} className={inputClass}><option value="">— Выберите —</option>{buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><label className={dark ? "block text-lg font-bold text-white" : "block font-medium"}>Этаж *<select name="floorId" required value={floorId} onChange={(event) => setFloorId(event.target.value)} disabled={!buildingId} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}><option value="">{buildingId ? "— Выберите —" : "Сначала выберите корпус"}</option>{availableFloors.map((floor) => <option key={floor.id} value={floor.id}>Этаж {floor.number}</option>)}</select></label></div>;
}
