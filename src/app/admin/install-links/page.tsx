import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { createExecutorLink } from "@/server/actions/executor-access";
import { decryptExecutorToken } from "@/lib/executor-link-token";

export const dynamic = "force-dynamic";

export default async function InstallLinksPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const now = new Date();
  const [bookings, activeLinks, requestHeaders] = await Promise.all([
    prisma.booking.findMany({ where: { status: "APPROVED", bookingGroupId: { not: null }, ...(user.role === "ADMIN" ? {} : { requesterId: user.id }) }, include: { campaign: true, location: true }, orderBy: { startDate: "asc" } }),
    prisma.installationAccessLink.findMany({ where: { revokedAt: null, expiresAt: { gt: now }, ...(user.role === "ADMIN" ? {} : { createdById: user.id }) }, orderBy: { expiresAt: "asc" } }),
    headers(),
  ]);
  const groups = [...new Map(bookings.map((booking) => [booking.bookingGroupId, booking])).values()];
  const linkBookings = activeLinks.length ? await prisma.booking.findMany({ where: { bookingGroupId: { in: activeLinks.map((item) => item.bookingGroupId) } }, include: { campaign: true, location: true }, orderBy: { startDate: "asc" } }) : [];
  const bookingsByGroup = new Map<string, typeof linkBookings>();
  for (const booking of linkBookings) {
    if (!booking.bookingGroupId) continue;
    bookingsByGroup.set(booking.bookingGroupId, [...(bookingsByGroup.get(booking.bookingGroupId) ?? []), booking]);
  }
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : process.env.AUTH_URL ?? "http://localhost:3001";

  return <main className="mx-auto max-w-4xl p-6 md:p-8">
    <h1 className="text-3xl font-bold">Ссылки исполнителям</h1>
    <p className="mt-2 text-slate-300">Ссылка открывает конкретный список установок и действует 7 дней.</p>
    {query.link && <div className="mt-5 rounded-xl border border-emerald-400 bg-emerald-950/80 p-4"><p className="font-semibold">Новая ссылка создана:</p><a href={query.link} target="_blank" rel="noreferrer" className="mt-2 block break-all text-emerald-200 underline">{query.link}</a></div>}

    <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Активные ссылки</h2><p className="mt-1 text-sm text-slate-600">Ссылки, срок действия которых ещё не истёк.</p></div><span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-bold">{activeLinks.length}</span></div>
      <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        {activeLinks.map((item) => {
          const groupBookings = bookingsByGroup.get(item.bookingGroupId) ?? [];
          const token = item.tokenCiphertext ? decryptExecutorToken(item.tokenCiphertext) : null;
          const url = token ? `${origin}/install-access/${token}` : null;
          const firstBooking = groupBookings[0];
          return <article key={item.id} className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{firstBooking?.campaign.title ?? "Список установок"}</p><p className="mt-1 text-sm text-slate-600">{groupBookings.length ? `${groupBookings.length} точек · ${groupBookings.slice(0, 3).map((booking) => booking.location.name).join(", ")}${groupBookings.length > 3 ? "…" : ""}` : "В этом списке пока нет точек"}</p></div><span className="text-sm text-slate-600">До {item.expiresAt.toLocaleString("ru-RU")}</span></div>
            {url ? <a href={url} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm font-semibold text-blue-700 underline">{url}</a> : <p className="mt-3 text-sm text-amber-800">Ссылка создана до включения списка ссылок и не может быть восстановлена. Создайте новую для этого запроса.</p>}
          </article>;
        })}
        {activeLinks.length === 0 && <p className="rounded-xl bg-slate-100 p-4 text-slate-600">Активных ссылок пока нет.</p>}
      </div>
    </section>

    <section className="mt-8"><h2 className="mb-3 text-xl font-bold">Создать ссылку</h2><div className="space-y-3">{groups.map((booking) => <div key={booking.bookingGroupId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5"><div><p className="font-semibold">{booking.campaign.title}</p><p className="text-sm text-slate-600">{booking.location.name} · с {booking.startDate.toLocaleDateString("ru-RU")}</p></div><form action={async () => { "use server"; const result = await createExecutorLink(booking.bookingGroupId!); if (result.url) redirect(`/admin/install-links?link=${encodeURIComponent(result.url)}`); }}><button className="rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white">Создать ссылку</button></form></div>)}{groups.length === 0 && <p className="rounded-xl bg-white p-5 text-slate-600">Одобренных групп установок пока нет.</p>}</div></section>
  </main>;
}
