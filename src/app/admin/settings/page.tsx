import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { saveHomeSettings } from "@/server/actions/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireRole("ADMIN");
  const home = await prisma.siteSetting.findUnique({ where: { key: "home" } });
  return <main className="mx-auto max-w-5xl p-6 md:p-8"><h1 className="text-3xl font-bold">Настройки</h1><section className="mt-6 rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Главная страница</h2><form action={saveHomeSettings} className="mt-4 grid gap-4"><label>Главный заголовок<input name="title" required defaultValue={home?.title ?? "PRoject"} className="mt-1 w-full rounded-lg border p-3" /></label><label>Подзаголовок<input name="subtitle" required defaultValue={home?.subtitle ?? "Система сопровождения рекламных размещений"} className="mt-1 w-full rounded-lg border p-3" /></label><label>Информационное описание<textarea name="description" required rows={3} defaultValue={home?.description ?? "Создавайте запросы, выбирайте рекламные точки и контролируйте установку материалов"} className="mt-1 w-full rounded-lg border p-3" /></label><button className="w-fit rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white">Сохранить</button></form></section></main>;
}
