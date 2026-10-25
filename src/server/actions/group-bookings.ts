"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";

const productLabels = { POSTER: "Афиша", PRISM: "Призма", BANNER: "Баннер", TELEVISION: "Телевизор", LED_DISPLAY: "LED-дисплей", CUSTOM: "Нестандартный объект" } as const;
const placementSchema = z.object({
  object: z.enum(["POSTER", "PRISM", "BANNER", "TELEVISION", "LED_DISPLAY", "CUSTOM"]),
  buildingId: z.string().min(1),
  floorId: z.string().min(1),
  locationId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
});
const schema = z.object({
  requestName: z.string().trim().min(2).max(200),
  screenSlotIds: z.array(z.string()).default([]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  placements: z.array(placementSchema).min(1).max(100),
  comment: z.string().max(2000).optional(),
});

export async function createGroupBooking(formData: FormData) {
  const user = await requireUser();
  const screenSlotIds = formData.getAll("screenSlotIds").map(String);
  let placements: unknown;
  try { placements = JSON.parse(String(formData.get("placements") ?? "[]")); } catch { placements = []; }
  const parsed = schema.safeParse({ ...Object.fromEntries(formData), screenSlotIds, placements });
  if (!parsed.success || parsed.data.endDate < parsed.data.startDate) return { error: "Заполните все блоки и укажите корректный период." };

  try {
    const grouped = new Map<string, typeof parsed.data.placements>();
    for (const placement of parsed.data.placements) grouped.set(placement.locationId, [...(grouped.get(placement.locationId) ?? []), placement]);
    const groupId = crypto.randomUUID();

    await prisma.$transaction(async (tx) => {
      const locations = await tx.location.findMany({ where: { id: { in: [...grouped.keys()] }, isActive: true }, include: { floor: true } });
      if (locations.length !== grouped.size) throw new Error("Одна из выбранных точек больше недоступна. Обновите страницу и проверьте блоки.");

      const locationById = new Map(locations.map((location) => [location.id, location]));
      for (const placement of parsed.data.placements) {
        const location = locationById.get(placement.locationId);
        if (!location || location.floor.buildingId !== placement.buildingId || location.floorId !== placement.floorId) throw new Error("Выбранная точка не соответствует корпусу или этажу в одном из блоков.");
        if (placement.object !== "CUSTOM" && location.type !== placement.object) throw new Error("Тип продукции не соответствует выбранной точке. Проверьте блок.");
      }

      const slots = parsed.data.screenSlotIds.length ? await tx.screenSlot.findMany({ where: { id: { in: parsed.data.screenSlotIds }, isActive: true } }) : [];
      if (slots.length !== parsed.data.screenSlotIds.length) throw new Error("Один из выбранных слотов экранов недоступен.");
      const slotLocationIds = new Set(locations.map((location) => location.id));
      if (slots.some((slot) => !slotLocationIds.has(slot.locationId))) throw new Error("Выбранный слот относится к экрану, которого нет в блоках размещения.");

      const campaign = await tx.campaign.create({ data: { title: parsed.data.requestName, description: parsed.data.comment, startDate: parsed.data.startDate, endDate: parsed.data.endDate, ownerId: user.id, status: "DRAFT" } });
      for (const location of locations) {
        const items = grouped.get(location.id) ?? [];
        const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
        if (!location.isUnlimitedCapacity && quantity > (location.capacity ?? 0)) throw new Error(`Недостаточная вместимость: ${location.name}.`);
        const conflict = location.isUnlimitedCapacity ? null : await tx.booking.findFirst({ where: { locationId: location.id, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: parsed.data.endDate }, endDate: { gte: parsed.data.startDate } } });
        if (conflict) throw new Error(`Площадка уже занята: ${location.name}.`);
        const booking = await tx.booking.create({ data: {
          bookingGroupId: groupId,
          campaignId: campaign.id,
          locationId: location.id,
          requesterId: user.id,
          startDate: parsed.data.startDate,
          endDate: parsed.data.endDate,
          quantity,
          objects: [...new Set(items.map((item) => productLabels[item.object]))],
          productQuantities: items.map((item) => ({ object: productLabels[item.object], quantity: item.quantity })),
          comment: parsed.data.comment,
          status: "PENDING",
        } });
        await tx.bookingHistory.create({ data: { bookingId: booking.id, actorId: user.id, status: "PENDING", comment: "Запрос отправлен на согласование" } });
        for (const slot of slots.filter((item) => item.locationId === location.id)) {
          const occupied = await tx.bookingScreenSlot.findFirst({ where: { slotId: slot.id, booking: { status: { in: ["PENDING", "APPROVED"] } } } });
          if (occupied) throw new Error(`Слот экрана уже занят: ${location.name}.`);
          await tx.bookingScreenSlot.create({ data: { bookingId: booking.id, slotId: slot.id, quantity } });
        }
      }
    });

    revalidatePath("/requests");
    revalidatePath("/calendar");
    redirect("/requests");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: error instanceof Error ? error.message : "Не удалось создать запрос." };
  }
}
