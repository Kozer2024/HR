"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
const schema = z.object({ locationId: z.string().min(1), startAt: z.coerce.date(), endAt: z.coerce.date(), capacity: z.coerce.number().int().positive() });
export async function createScreenSlot(formData: FormData) { await requireRole("ADMIN"); const parsed = schema.safeParse(Object.fromEntries(formData)); if (!parsed.success || parsed.data.endAt <= parsed.data.startAt) return; await prisma.screenSlot.create({ data: parsed.data }); revalidatePath("/admin/screens"); }
export async function deactivateScreenSlot(id: string) { await requireRole("ADMIN"); await prisma.screenSlot.update({ where: { id }, data: { isActive: false } }); revalidatePath("/admin/screens"); }
