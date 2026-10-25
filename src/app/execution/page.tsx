import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { InstallationChecklist } from "@/components/execution/installation-checklist";

export const dynamic = "force-dynamic";

export default async function ExecutionPage() {
  const user = await requireUser();
  const bookings = await prisma.booking.findMany({
    where: { status: "APPROVED", ...(user.role === "ADMIN" ? {} : { requesterId: user.id }) },
    include: { campaign: true, location: { include: { floor: { include: { building: true } } } }, installationMarkedBy: true, installationEvents: { orderBy: { createdAt: "desc" } } },
    orderBy: { startDate: "asc" },
  });
  const grouped = new Map<string, { id: string; title: string; startDate: Date; endDate: Date; items: (ReturnType<typeof mapBooking>)[] }>();
  function mapBooking(booking: (typeof bookings)[number]) {
    return {
      id: booking.id,
      location: booking.location.name,
      building: booking.location.floor.building.name,
      buildingOrder: booking.location.floor.building.sortOrder,
      floor: booking.location.floor.number,
      campaign: booking.campaign.title,
      start: booking.startDate.toLocaleDateString("ru-RU"),
      end: booking.endDate.toLocaleDateString("ru-RU"),
      objects: booking.objects,
      comment: booking.comment,
      description: booking.location.description,
      percent: booking.installationProgress,
      markedBy: booking.installationMarkedBy ? `${booking.installationMarkedBy.name} · ${booking.installationMarkedBy.studyGroup} · ${booking.installationMarkedAt?.toLocaleString("ru-RU") ?? ""}` : null,
      events: booking.installationEvents.map((event) => ({ action: event.action, actorName: event.actorName, actorType: event.actorType, createdAt: event.createdAt.toISOString() })),
      photoUrl: booking.location.photoUrls[0] ?? null,
    };
  }
  for (const booking of bookings) {
    const item = mapBooking(booking);
    const group = grouped.get(booking.campaignId);
    if (group) {
      group.items.push(item);
      if (booking.startDate < group.startDate) group.startDate = booking.startDate;
      if (booking.endDate > group.endDate) group.endDate = booking.endDate;
    } else {
      grouped.set(booking.campaignId, { id: booking.campaignId, title: booking.campaign.title, startDate: booking.startDate, endDate: booking.endDate, items: [item] });
    }
  }
  const groups = [...grouped.values()]
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime() || a.title.localeCompare(b.title, "ru"))
    .map((group) => ({
      id: group.id,
      title: group.title,
      start: group.startDate.toLocaleDateString("ru-RU"),
      end: group.endDate.toLocaleDateString("ru-RU"),
      items: group.items
        .sort((a, b) => a.buildingOrder - b.buildingOrder || a.building.localeCompare(b.building, "ru", { numeric: true, sensitivity: "base" }) || a.floor - b.floor || a.location.localeCompare(b.location, "ru", { numeric: true, sensitivity: "base" }))
        .map((item) => {
          const { buildingOrder, ...publicItem } = item;
          void buildingOrder;
          return publicItem;
        }),
    }));

  return <main className="mx-auto max-w-7xl p-6 md:p-8"><h1 className="text-3xl font-bold">{user.role === "ADMIN" ? "Установки" : "Мои установки"}</h1><p className="mt-2 text-slate-300">Отмечайте каждую точку после установки. Процент сохраняется и пересчитывается автоматически.</p><InstallationChecklist groups={groups} /></main>;
}
