import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { approveUser, deleteUser } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

function UserRow({ user, pending = false }: { user: { id: string; name: string; email: string; role: string; status: string }; pending?: boolean }) {
  return <tr className="border-b last:border-0"><td className="p-4">{user.name}</td><td className="p-4">{user.email}</td><td className="p-4">{user.role}</td><td className="p-4">{user.status}</td><td className="p-4"><div className="flex flex-wrap gap-2">{pending && <form action={async () => { "use server"; await approveUser(user.id); }}><button className="rounded-lg bg-emerald-600 px-3 py-2 text-white">Подтвердить</button></form>}{user.role !== "ADMIN" && <form action={async () => { "use server"; await deleteUser(user.id); }}><button className="rounded-lg border border-rose-300 bg-rose-700 px-3 py-2 text-white">Удалить</button></form>}</div></td></tr>;
}

function UsersTable({ users, pending = false }: { users: { id: string; name: string; email: string; role: string; status: string }[]; pending?: boolean }) {
  return <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full min-w-[700px] text-left text-sm text-slate-900"><thead className="border-b-2 border-slate-700 bg-slate-950 text-white"><tr><th className="p-4">Имя</th><th className="p-4">Email</th><th className="p-4">Роль</th><th className="p-4">Статус</th><th className="p-4">Действие</th></tr></thead><tbody>{users.map((user) => <UserRow key={user.id} user={user} pending={pending} />)}{users.length === 0 && <tr><td colSpan={5} className="p-6 text-slate-500">Заявок нет.</td></tr>}</tbody></table></div>;
}

export default async function AdminUsersPage() {
  await requireRole("ADMIN");
  const [pendingUsers, activeUsers] = await Promise.all([
    prisma.user.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { status: { not: "PENDING" } }, orderBy: { createdAt: "desc" } }),
  ]);

  return <main className="mx-auto max-w-7xl p-6 md:p-8"><h1 className="text-3xl font-bold">Пользователи</h1><p className="mt-2 text-slate-300">Подтверждайте новые заявки. Активные аккаунты больше не отображаются в очереди регистрации.</p><section className="mt-6"><h2 className="mb-3 text-xl font-semibold text-white">Заявки на регистрацию ({pendingUsers.length})</h2><UsersTable users={pendingUsers} pending /></section><section className="mt-8"><h2 className="mb-3 text-xl font-semibold text-white">Подтверждённые и заблокированные аккаунты ({activeUsers.length})</h2><UsersTable users={activeUsers} /></section></main>;
}
