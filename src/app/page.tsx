import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const settings = await prisma.siteSetting.findUnique({ where: { key: "home" } });
  const title = settings?.title ?? "PRoject";
  const subtitle = settings?.subtitle ?? "Система сопровождения рекламных размещений";
  const description = settings?.description ?? "Создавайте запросы, выбирайте рекламные точки и контролируйте установку материалов";
  return <main className="min-h-screen px-6 py-16 text-white"><div className="mx-auto max-w-5xl rounded-2xl border border-white/20 bg-slate-950/75 p-8 md:p-12"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">МГТУ им. Н. Э. Баумана</p><h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight">{title}</h1><h2 className="mt-4 max-w-2xl text-2xl font-semibold text-slate-200">{subtitle}</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{description}</p><div className="mt-10 flex flex-wrap gap-4"><Link href="/login" className="rounded-xl bg-[#1D74E8] px-5 py-3 font-semibold hover:bg-blue-500">Войти в систему</Link><Link href="/register" className="rounded-xl border border-white/40 px-5 py-3 font-semibold hover:bg-white/10">Зарегистрироваться</Link></div><div className="mt-16 grid gap-4 sm:grid-cols-3">{[["01","Площадки","Каталог рекламных точек и свободной вместимости"],["02","Заявки","Выбор корпусов, дат и объектов размещения"],["03","Установки","Контроль выполнения и список для исполнителей"]].map(([n,t,d]) => <article key={n} className="rounded-2xl border border-white/20 bg-slate-950/70 p-6"><span className="text-blue-300">{n}</span><h2 className="mt-8 text-xl font-semibold">{t}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{d}</p></article>)}</div></div></main>;
}
