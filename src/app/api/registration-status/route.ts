import { prisma } from "@/lib/prisma";
import { verifyRegistrationStatusToken } from "@/lib/registration-status-token";

export async function POST(request: Request) {
  let token: string | null = null;
  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null && "token" in body && typeof body.token === "string") token = body.token;
  } catch {
    return Response.json({ error: "Некорректный запрос." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const userId = verifyRegistrationStatusToken(token);
  if (!userId) return Response.json({ error: "Ссылка проверки недействительна или истекла." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!user) return Response.json({ error: "Заявка не найдена." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return Response.json({ status: user.status }, { headers: { "Cache-Control": "no-store" } });
}
