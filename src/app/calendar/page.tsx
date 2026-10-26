import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { CalendarFilters } from "@/components/calendar/calendar-filters";

export const dynamic = "force-dynamic";

const typeLabels: Record<string, string> = { POSTER: "Афиши", PRISM: "Призмы", BANNER: "Баннеры", TELEVISION: "Телевизор", LED_DISPLAY: "LED-дисплей" };
const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function parseMonth(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? new Date(Date.UTC(year, month - 1, 1)) : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; type?: string; building?: string; floor?: string }> }) {
  await requireUser();
  const filters = await searchParams;
  const monthStart = parseMonth(filters.month);
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const type = filters.type && Object.hasOwn(typeLabels, filters.type) ? filters.type as keyof typeof typeLabels : "ALL";
  const [allActiveLocations, allFloors] = await Promise.all([
    prisma.location.findMany({ where: { isActive: true }, select: { id: true, type: true, floorId: true, floor: { select: { number: true, buildingId: true, building: { select: { name: true } } } } }, orderBy: [{ floor: { building: { sortOrder: "asc" } } }, { floor: { building: { name: "asc" } } }, { name: "asc" }] }),
    prisma.floor.findMany({ include: { building: { select: { name: true } } }, orderBy: [{ building: { sortOrder: "asc" } }, { building: { name: "asc" } }, { number: "asc" }] }),
  ]);
  const availableForType = allActiveLocations.filter((location) => type === "ALL" || location.type === type);
  const validBuilding = filters.building && availableForType.some((location) => location.floor.buildingId === filters.building) ? filters.building : undefined;
  const availableForBuilding = availableForType.filter((location) => !validBuilding || location.floor.buildingId === validBuilding);
  const eligibleBuildingIds = new Set(availableForType.map((location) => location.floor.buildingId));
  const validFloorOptions = allFloors.filter((floor) => eligibleBuildingIds.has(floor.buildingId) && (!validBuilding || floor.buildingId === validBuilding));
  const validFloor = filters.floor && validFloorOptions.some((floor) => floor.id === filters.floor) ? filters.floor : undefined;
  const locations = availableForBuilding.filter((location) => !validFloor || location.floorId === validFloor);
  const bookings = locations.length ? await prisma.booking.findMany({
    where: { locationId: { in: locations.map((location) => location.id) }, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: monthEnd }, endDate: { gte: monthStart } },
    select: { locationId: true, startDate: true, endDate: true },
  }) : [];
  const bookingsByLocation = new Map<string, typeof bookings>();
  for (const booking of bookings) bookingsByLocation.set(booking.locationId, [...(bookingsByLocation.get(booking.locationId) ?? []), booking]);

  const offset = (monthStart.getUTCDay() + 6) % 7;
  const cells: Array<number | null> = [...Array.from({ length: offset }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (cells.length % 7) cells.push(null);
  const todayKey = new Date().toISOString().slice(0, 10);
  const dateKey = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const monthTitle = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(monthStart);
  const prevMonth = new Date(Date.UTC(year, month - 1, 1));
  const nextMonth = new Date(Date.UTC(year, month + 1, 1));
  const queryForMonth = (target: Date) => {
    const params = new URLSearchParams({ month: monthKey(target) });
    if (type !== "ALL") params.set("type", type);
    if (validBuilding) params.set("building", validBuilding);
    if (validFloor) params.set("floor", validFloor);
    return `/calendar?${params.toString()}`;
  };

  return <main className="mx-auto max-w-7xl p-3 sm:p-6 md:p-8">
    <h1 className="text-3xl font-bold">Календарь свободных точек</h1>
    <p className="mt-2 text-slate-300">В каждой дате показано, сколько активных точек свободно. Заявки на согласовании и одобренные считаются занятыми.</p>
    <CalendarFilters month={monthKey(monthStart)} type={type} building={validBuilding ?? ""} floor={validFloor ?? ""} locations={allActiveLocations} allFloors={allFloors} />

    <section className="mt-6 rounded-2xl bg-white p-2 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-2"><Link href={queryForMonth(prevMonth)} aria-label="Предыдущий месяц" className="rounded-lg border border-slate-400 px-3 py-2 font-semibold hover:bg-slate-100 sm:px-4">←</Link><h2 className="text-center text-base font-bold capitalize sm:text-xl">{monthTitle}</h2><Link href={queryForMonth(nextMonth)} aria-label="Следующий месяц" className="rounded-lg border border-slate-400 px-3 py-2 font-semibold hover:bg-slate-100 sm:px-4">→</Link></div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-2">{weekdays.map((day) => <div key={day} className="p-1 text-center text-xs font-bold text-slate-600 sm:p-2 sm:text-sm">{day}</div>)}{cells.map((day, index) => {
        if (day === null) return <div key={`empty-${index}`} aria-hidden="true" className="min-h-20 rounded-lg bg-slate-100/50 sm:min-h-28" />;
        const currentStart = new Date(Date.UTC(year, month, day));
        const currentEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
        const free = locations.reduce((count, location) => {
          const isBusy = (bookingsByLocation.get(location.id) ?? []).some((booking) => booking.startDate <= currentEnd && booking.endDate >= currentStart);
          return count + (isBusy ? 0 : 1);
        }, 0);
        const isToday = dateKey(day) === todayKey;
        return <div key={day} className={`flex min-h-20 min-w-0 flex-col rounded-lg border p-1 sm:min-h-28 sm:p-3 ${isToday ? "border-blue-500 ring-2 ring-blue-500/40" : "border-slate-300"}`}><span className="text-xs font-semibold sm:text-sm">{day}</span><span className="mt-auto text-center"><strong className="block text-lg font-bold leading-tight sm:text-3xl">{free}</strong><span className="sr-only text-[10px] font-medium text-slate-600 sm:not-sr-only sm:text-xs">свободно</span></span></div>;
      })}</div>
      <p className="mt-4 text-sm text-slate-600">Точек по выбранным фильтрам: {locations.length}</p>
    </section>
  </main>;
}
