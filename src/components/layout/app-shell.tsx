import Link from "next/link";
import { auth } from "@/lib/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const organizerLinks = [["/requests/new", "Создать запрос"], ["/requests", "Мои запросы"], ["/calendar", "Календарь"], ["/execution", "Установки"], ["/admin/install-links", "Ссылки исполнителям"]] as const;
const executorLinks = [["/execution", "Мои установки"], ["/calendar", "Календарь"]] as const;
const adminLinks = [["/requests", "Запросы"], ["/calendar", "Календарь"], ["/execution", "Установки"], ["/admin/install-links", "Ссылки исполнителям"], ["/admin/screens", "Слоты экранов"], ["/admin/users", "Пользователи"], ["/admin/locations", "Управление точками"], ["/admin/import", "Импорт Excel"], ["/admin/audit", "История действий"]] as const;

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) return <div className="app-frame flex min-h-screen flex-col"><div className="fixed right-4 top-4 z-50"><ThemeToggle /></div><div className="flex-1">{children}</div><Footer /></div>;
  const links = session.user.role === "ADMIN" ? adminLinks : session.user.role === "EXECUTOR" ? executorLinks : organizerLinks;
  return <div className="app-frame flex min-h-screen flex-col text-white"><header className="app-header sticky top-0 z-30"><div className="app-header-inner mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6"><Link href="/dashboard" className="app-brand shrink-0" aria-label="PRoject — главное меню"><span className="app-brand-mark" aria-hidden="true">✳</span><span><span className="app-brand-name">PR<span>o</span>ject</span><span className="app-brand-caption">HR BMSTU</span></span></Link><nav aria-label="Основная навигация" className="app-nav order-3 flex w-full gap-1 overflow-x-auto pb-1 text-sm font-semibold sm:order-none sm:w-auto sm:flex-1 sm:flex-wrap sm:justify-center sm:pb-0">{links.map(([href, label]) => <Link key={href} href={href} className="app-nav-link whitespace-nowrap">{label}</Link>)}</nav><div className="app-tools ml-auto flex items-center gap-2"><ThemeToggle /><Link href="/profile" className="app-profile-link">Профиль</Link>{session.user.role === "ADMIN" && <Link href="/admin/settings" className="app-settings-link">Настройки сайта</Link>}</div></div></header><div className="flex-1">{children}</div><Footer /></div>;
}

function Footer() { return <footer className="app-footer px-6 py-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><div><p className="text-lg font-bold text-white">PRoject <span className="app-footer-mark">✳</span></p><p className="mt-2 text-sm">Система сопровождения рекламных размещений</p></div><div><p className="font-semibold text-white">Контакт</p><a className="app-footer-link underline" href="https://t.me/Andrey_Dimitrevskiy">@Andrey_Dimitrevskiy</a></div></div></footer>; }
