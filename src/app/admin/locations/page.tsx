import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { LocationCreateForm } from "@/components/admin/location-create-form";
import { LocationsList } from "@/components/admin/locations-list";
import { createBuilding, deleteBuilding, moveBuilding, updateBuilding } from "@/server/actions/locations";

export const dynamic = "force-dynamic";
export default async function AdminLocationsPage() {
  await requireRole("ADMIN");
  const [buildings, floors, locations] = await Promise.all([
    prisma.building.findMany({ include: { floors: { orderBy: { number: "asc" } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.floor.findMany({ include: { building: true }, orderBy: [{ buildingId: "asc" }, { number: "asc" }] }),
    prisma.location.findMany({ include: { floor: { include: { building: { include: { campus: true } } } } }, orderBy: { createdAt: "desc" } }),
  ]);
  const buildingOptions = buildings.map(({ id, name }) => ({ id, name }));

  return <main className="mx-auto max-w-7xl p-6 md:p-8">
    <h1 className="text-3xl font-bold">Управление точками</h1>
    <p className="mt-2 text-slate-300">Создавайте и редактируйте PR-локации.</p>
    <section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-white/20 bg-[#080c18]/90 p-6 shadow-2xl md:p-8">
      <h2 className="text-center text-3xl font-bold text-white">PR-локации</h2>
      <p className="mt-2 text-center text-slate-300">Выберите тип → корпус → этаж → заполните данные</p>
      <LocationCreateForm buildings={buildingOptions} floors={floors} />
    </section>
    <section className="mt-8">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Новый корпус</h2>
        <AdminActionForm action={async (data) => { "use server"; return createBuilding(data); }}>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]"><input name="name" required placeholder="Например, корпус А" className="rounded-lg border p-3" /><input name="floorCount" type="number" min="1" max="200" required placeholder="Этажей" className="rounded-lg border p-3" /><button className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white">Добавить</button></div>
        </AdminActionForm>
        <p className="mt-2 text-sm text-slate-500">Этажи создадутся автоматически.</p>
        <details open className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-2"><summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 font-semibold text-slate-950"><span>Корпуса</span><span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-950">{buildings.length}</span></summary><div className="mt-2 space-y-2">{buildings.map((building, index) => <details key={building.id} className="rounded-xl border border-slate-300 bg-white text-slate-950"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4"><span className="font-semibold">{building.name}</span><span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-950">{building.floors.length} этажей</span></summary><div className="border-t border-slate-200 p-4"><p className="text-sm font-semibold text-slate-800">Этажи: {building.floors.length ? building.floors.map((floor) => floor.number).join(", ") : "не добавлены"}</p><div className="mt-3 flex flex-wrap items-center gap-2"><span className="mr-auto text-sm text-slate-600">Порядок в списках · позиция {index + 1}</span>{index > 0 && <AdminActionForm action={async (data) => { "use server"; return moveBuilding(data); }}><input type="hidden" name="buildingId" value={building.id} /><input type="hidden" name="direction" value="up" /><button aria-label={`Переместить ${building.name} выше`} className="rounded-lg border border-slate-400 px-3 py-2 font-semibold">↑ Выше</button></AdminActionForm>}{index < buildings.length - 1 && <AdminActionForm action={async (data) => { "use server"; return moveBuilding(data); }}><input type="hidden" name="buildingId" value={building.id} /><input type="hidden" name="direction" value="down" /><button aria-label={`Переместить ${building.name} ниже`} className="rounded-lg border border-slate-400 px-3 py-2 font-semibold">↓ Ниже</button></AdminActionForm>}</div><AdminActionForm action={async (data) => { "use server"; return updateBuilding(data); }}><div className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="buildingId" value={building.id} /><input name="name" required maxLength={120} defaultValue={building.name} aria-label="Название корпуса" className="min-w-0 flex-1 rounded-lg border border-slate-400 p-3 text-slate-950" /><button className="rounded-lg bg-blue-800 px-4 py-3 font-semibold text-white">Сохранить название</button></div></AdminActionForm><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-slate-600">Чтобы добавить этаж, используйте форму ниже.</span><AdminActionForm action={async () => { "use server"; return deleteBuilding(building.id); }}><button className="rounded-lg border border-rose-700 px-3 py-2 text-sm font-semibold text-rose-900">Удалить корпус</button></AdminActionForm></div></div></details>)}</div></details>
      </section>
    </section>
    <LocationsList locations={locations} buildings={buildingOptions} floors={floors} />
  </main>;
}
