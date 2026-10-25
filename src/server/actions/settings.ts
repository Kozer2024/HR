"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";

const homeSchema = z.object({ title: z.string().trim().min(1).max(120), subtitle: z.string().trim().min(1).max(200), description: z.string().trim().min(1).max(1000) });

export async function saveHomeSettings(formData: FormData) {
  await requireRole("ADMIN");
  const parsed = homeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await prisma.siteSetting.upsert({ where: { key: "home" }, update: parsed.data, create: { key: "home", ...parsed.data } });
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/admin/settings");
}
