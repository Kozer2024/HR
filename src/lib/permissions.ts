import { auth } from "./auth";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";
export async function requireUser() { const session = await auth(); if (!session?.user?.id) redirect("/login"); const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true, status: true } }); if (!user || user.status !== "ACTIVE") redirect("/login"); return user; }
export async function requireRole(...roles: string[]) { const user = await requireUser(); if (!roles.includes(user.role)) redirect("/calendar"); return user; }
