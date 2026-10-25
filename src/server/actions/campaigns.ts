"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
const schema = z.object({ title: z.string().min(3).max(160), description: z.string().max(2000).optional(), startDate: z.coerce.date(), endDate: z.coerce.date() });
export async function createCampaign(formData: FormData) { const user = await requireUser(); const parsed = schema.safeParse(Object.fromEntries(formData)); if (!parsed.success || parsed.data.endDate < parsed.data.startDate) return { error: "Проверьте название и даты кампании." }; await prisma.campaign.create({ data: { ...parsed.data, ownerId: user.id } }); revalidatePath("/campaigns"); return { success: "Кампания создана." }; }
