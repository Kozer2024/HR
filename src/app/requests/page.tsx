import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { reviewBookingGroup } from "@/server/actions/admin";
import { deleteRequest, resubmitBookingGroup } from "@/server/actions/bookings";
import { PhotoLightbox } from "@/components/locations/photo-lightbox";

export const dynamic = "force-dynamic";

const statuses: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Черновик", className: "bg-slate-200 text-slate-800" },
  PENDING: { label: "На согласовании", className: "bg-amber-100 text-amber-900" },
  APPROVED: { label: "Одобрен", className: "bg-emerald-100 text-emerald-900" },
  REJECTED: { label: "Отклонён", className: "bg-rose-100 text-rose-900" },
  CANCELLED: { label: "Отменён", className: "bg-slate-200 text-slate-800" },
};

function productLines(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item !== "object" || item === null) return "Продукция";
    const record = item as Record<string, unknown>;
    return `${String(record.object ?? "Продукция")} — ${String(record.quantity ?? "—")} шт.`;
  });
}

export default async function RequestsPage() {
  const user = await requireUser();
  const bookings = await prisma.booking.findMany({
    where: user.role === "ADMIN" ? {} : { requesterId: user.id },
    include: { campaign: true, location: { include: { floor: { include: { building: true } } } }, requester: true },
    orderBy: { createdAt: "desc" },
  });
  const groups = [...bookings.reduce((map, booking) => map.set(booking.campaignId, [...(map.get(booking.campaignId) ?? []), booking]), new Map<string, typeof bookings>()).values()];

  return <main className="mx-auto max-w-7xl p-6 md:p-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">{user.role === "ADMIN" ? "Запросы на размещение" : "Мои запросы"}</h1><p className="mt-2 text-slate-300">Каждый запрос содержит все добавленные организатором блоки размещения.</p></div>{user.role !== "ADMIN" && <Link href="/requests/new" aria-label="Новый запрос" title="Новый запрос" className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 text-white shadow-lg transition hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-300"><Plus className="h-7 w-7" aria-hidden="true" /></Link>}</div>
    <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full min-w-[900px] text-left text-sm text-slate-900">
      <thead className="border-b-2 border-slate-700 bg-slate-950 text-white"><tr><th className="p-4">Запрос</th><th className="p-4">Блоки размещения</th><th className="p-4">Период</th><th className="p-4">Автор</th><th className="p-4">Статус</th><th className="p-4">Действие</th></tr></thead>
      <tbody>{groups.map((group) => {
        const request = group[0];
        const stateSet = new Set(group.map((item) => item.status));
        const stateKey = stateSet.size === 1 ? request.status : "MIXED";
        const status = statuses[stateKey] ?? { label: "Частично обработан", className: "bg-orange-100 text-orange-900" };
        const hasPending = group.some((item) => item.status === "PENDING");
        const canResubmit = group.every((item) => item.status === "REJECTED" || item.status === "CANCELLED");
        const startDate = new Date(Math.min(...group.map((item) => item.startDate.getTime())));
        const endDate = new Date(Math.max(...group.map((item) => item.endDate.getTime())));
        return <tr key={request.campaignId} className="border-b align-top last:border-0">
          <td className="p-4"><Link className="font-bold text-blue-800 underline" href={`/requests/${request.id}`}>{request.campaign.title}</Link><p className="mt-1 text-xs font-medium text-slate-700">Один запрос · {group.length} {group.length === 1 ? "точка" : "точек"}</p>{request.campaign.description && <p className="mt-2 max-w-xs whitespace-pre-wrap text-sm text-slate-800">{request.campaign.description}</p>}</td>
          <td className="p-4"><details><summary className="cursor-pointer font-bold text-blue-800 underline">Показать блоки ({group.length})</summary><ul className="mt-2 space-y-3">{group.map((item) => <li key={item.id} className="flex gap-3 rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-950 shadow-sm"><div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-md border border-slate-400 bg-white">{item.location.photoUrls[0] ? <PhotoLightbox src={item.location.photoUrls[0]} alt={`Фото точки ${item.location.name}`} className="h-full w-full" /> : <span className="flex h-full items-center justify-center p-2 text-center text-xs font-medium text-slate-700">Фото не добавлено</span>}</div><div className="min-w-0"><p className="font-bold text-slate-950">{item.location.name}</p><p className="text-sm font-medium text-slate-800">{item.location.floor.building.name}, этаж {item.location.floor.number}</p><p className="mt-1 text-sm font-medium text-slate-900">{productLines(item.productQuantities).join("; ") || item.objects.join(", ") || "Продукция не указана"} · {item.quantity} шт.</p>{item.location.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{item.location.description}</p>}{item.comment && <p className="mt-2 whitespace-pre-wrap rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900"><strong>Комментарий к запросу:</strong> {item.comment}</p>}</div></li>)}</ul></details></td>
          <td className="p-4">{startDate.toLocaleDateString("ru-RU")} — {endDate.toLocaleDateString("ru-RU")}</td>
          <td className="p-4">{request.requester.name}</td>
          <td className="p-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>{status.label}</span></td>
          <td className="space-y-2 p-4">{user.role === "ADMIN" && hasPending && <><form action={async () => { "use server"; await reviewBookingGroup(request.campaignId, true); }}><button className="rounded bg-emerald-700 px-3 py-2 font-semibold text-white">Одобрить весь запрос</button></form><form action={async () => { "use server"; await reviewBookingGroup(request.campaignId, false); }}><button className="rounded bg-rose-700 px-3 py-2 font-semibold text-white">Отклонить весь запрос</button></form></>}{user.role !== "ADMIN" && canResubmit && <form action={async () => { "use server"; await resubmitBookingGroup(request.campaignId); }}><button className="rounded bg-blue-700 px-3 py-2 text-white">Отправить весь запрос снова</button></form>}{user.role === "ADMIN" && <form action={async () => { "use server"; await deleteRequest(request.id); }}><button className="rounded border border-rose-300 bg-rose-700 px-3 py-2 text-white">Удалить запрос</button></form>}</td>
        </tr>;
      })}{groups.length === 0 && <tr><td colSpan={6} className="p-6 text-slate-700">Запросов пока нет. Нажмите «+», чтобы создать первый.</td></tr>}</tbody>
    </table></div>
  </main>;
}
