import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  FilePlus2,
  Film,
  History,
  Images,
  MapPin,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import { auth } from "@/lib/auth";

const organizerItems = [
  { href: "/requests/new", title: "Создать запрос", description: "Соберите заявку из нескольких блоков размещения", icon: FilePlus2, group: "Запросы" },
  { href: "/requests", title: "Мои запросы", description: "Статусы и детали отправленных размещений", icon: ClipboardList, group: "Запросы" },
  { href: "/calendar", title: "Календарь", description: "Свободные рекламные точки по датам", icon: CalendarDays, group: "Размещения" },
  { href: "/execution", title: "Установки", description: "Ход выполнения одобренных размещений", icon: Wrench, group: "Размещения" },
  { href: "/admin/install-links", title: "Ссылки исполнителям", description: "Отправьте исполнителю список установок по защищённой ссылке", icon: ArrowUpRight, group: "Размещения" },
  { href: "/profile", title: "Профиль", description: "Данные учётной записи", icon: UserRound, group: "Аккаунт" },
];

const adminItems = [
  { href: "/requests", title: "Запросы", description: "Просмотр и согласование запросов на размещение", icon: ClipboardList, group: "Работа" },
  { href: "/calendar", title: "Календарь", description: "Занятость рекламных точек по датам", icon: CalendarDays, group: "Работа" },
  { href: "/execution", title: "Установки", description: "Контроль выполнения одобренных размещений", icon: Wrench, group: "Работа" },
  { href: "/admin/install-links", title: "Ссылки исполнителям", description: "Создание ссылок на списки установок", icon: ArrowUpRight, group: "Работа" },
  { href: "/profile", title: "Профиль", description: "Данные учётной записи", icon: UserRound, group: "Аккаунт" },
  { href: "/admin/screens", title: "Слоты экранов", description: "Расписание телевизоров и LED-дисплеев", icon: Film, group: "Управление" },
  { href: "/admin/users", title: "Пользователи", description: "Подтверждение и управление доступом", icon: Users, group: "Управление" },
  { href: "/admin/locations", title: "Управление точками", description: "Корпуса, этажи и рекламные места", icon: MapPin, group: "Управление" },
  { href: "/admin/import", title: "Импорт Excel", description: "Загрузка списка точек и фотографий", icon: Images, group: "Управление" },
  { href: "/admin/audit", title: "История действий", description: "Журнал изменений и экспорт данных", icon: History, group: "Управление" },
  { href: "/admin/settings", title: "Настройки сайта", description: "Общие параметры PRoject", icon: Settings2, group: "Управление" },
];

const executorItems = [
  { href: "/execution", title: "Мои установки", description: "Просмотр хода одобренных размещений", icon: ClipboardList, group: "Работа" },
  { href: "/calendar", title: "Календарь", description: "Свободные рекламные точки по датам", icon: CalendarDays, group: "Работа" },
  { href: "/profile", title: "Профиль", description: "Данные учётной записи", icon: UserRound, group: "Аккаунт" },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  const items = role === "ADMIN" ? adminItems : role === "EXECUTOR" ? executorItems : organizerItems;
  const groups = [...new Set(items.map((item) => item.group))];
  const firstName = session.user.name?.trim().split(/\s+/)[0] || "коллега";

  return (
    <main className="main-menu mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12">
      <section className="menu-hero relative mb-10 overflow-hidden rounded-[28px] border p-6 sm:p-9 lg:p-12">
        <div className="menu-hero-grid" aria-hidden="true" />
        <div className="menu-hero-star" aria-hidden="true">✳</div>
        <div className="relative z-10 max-w-3xl">
          <p className="menu-kicker"><Sparkles size={15} aria-hidden="true" /> PRoject · HR BMSTU</p>
          <h1 className="menu-title">ВСЁ ДЛЯ РАБОТЫ<br /><span>В ОДНОМ МЕСТЕ</span></h1>
          <p className="menu-welcome">Рады видеть, {firstName}. Выберите нужный раздел — и продолжайте работу.</p>
        </div>
        <div className="menu-role-badge"><ShieldCheck size={15} aria-hidden="true" /> {role === "ADMIN" ? "АДМИНИСТРАТОР" : role === "EXECUTOR" ? "ИСПОЛНИТЕЛЬ" : "ОРГАНИЗАТОР"}</div>
      </section>

      {groups.map((group) => (
        <section key={group} className="menu-group" aria-labelledby={`menu-${group}`}>
          <div className="menu-group-heading">
            <span className="menu-section-mark" aria-hidden="true" />
            <h2 id={`menu-${group}`}>{group}</h2>
          </div>
          <div className="menu-grid">
            {items.filter((item) => item.group === group).map(({ href, title, description, icon: Icon }, index) => (
              <Link key={href} href={href} className="menu-card" style={{ animationDelay: `${index * 70}ms` }}>
                <span className="menu-card-icon"><Icon size={32} strokeWidth={1.8} aria-hidden="true" /></span>
                <span className="menu-card-arrow"><ArrowUpRight size={24} strokeWidth={1.8} aria-hidden="true" /></span>
                <span className="menu-card-content">
                  <span className="menu-card-title">{title}</span>
                  <span className="menu-card-description">{description}</span>
                </span>
                <span className="menu-card-line" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
