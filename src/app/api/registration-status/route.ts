import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return Response.json({ error: "Не указан пользователь." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!user) return Response.json({ error: "Пользователь не найден." }, { status: 404 });
  return Response.json({ status: user.status });
}
