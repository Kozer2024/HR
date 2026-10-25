import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/permissions";
import { GroupBookingForm } from "@/components/requests/group-booking-form";

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/requests");
  const [buildings, floors, locations, slots] = await Promise.all([
    prisma.building.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.floor.findMany({ orderBy: [{ buildingId: "asc" }, { number: "asc" }] }),
    prisma.location.findMany({ where: { isActive: true }, include: { floor: { include: { building: true } } }, orderBy: { name: "asc" } }),
    prisma.screenSlot.findMany({ where: { isActive: true, endAt: { gte: new Date() } }, include: { location: true }, orderBy: { startAt: "asc" } }),
  ]);
  const locationOptions = locations.map((location) => ({ id: location.id, name: location.name, buildingId: location.floor.buildingId, building: location.floor.building.name, floorId: location.floorId, floor: location.floor.number, type: location.type }));
  const floorOptions = floors.map(({ id, number, buildingId }) => ({ id, number, buildingId }));

  return <main className="mx-auto max-w-4xl p-6 md:p-8"><h1 className="text-3xl font-bold">Новый запрос на размещение</h1><p className="mt-2 text-slate-300">Создайте один или несколько блоков «тип продукции → корпус → этаж → точка», задайте период и отправьте всё одним запросом.</p><GroupBookingForm buildings={buildings} floors={floorOptions} locations={locationOptions} slots={slots.map((slot) => ({ id: slot.id, location: slot.location, startAt: slot.startAt.toISOString(), endAt: slot.endAt.toISOString() }))} /></main>;
}
