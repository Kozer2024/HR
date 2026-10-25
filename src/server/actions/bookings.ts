"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
const schema = z.object({ campaignId: z.string().min(1), locationId: z.string().min(1), startDate: z.coerce.date(), endDate: z.coerce.date(), quantity: z.coerce.number().int().positive() });
export async function createBooking(formData: FormData) { const user = await requireUser(); const parsed = schema.safeParse(Object.fromEntries(formData)); if (!parsed.success || parsed.data.endDate < parsed.data.startDate) return { error: "Проверьте площадку, даты и количество." }; const { campaignId, locationId, startDate, endDate, quantity } = parsed.data; try { const result = await prisma.$transaction(async (tx) => { const location = await tx.location.findUnique({ where: { id: locationId } }); if (!location || !location.isActive || (!location.isUnlimitedCapacity && quantity > (location.capacity ?? 0))) throw new Error("Площадка недоступна или превышена вместимость."); const conflict = location.isUnlimitedCapacity ? null : await tx.booking.findFirst({ where: { locationId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: endDate }, endDate: { gte: startDate } } }); if (conflict) throw new Error("Площадка уже занята в выбранные даты."); return tx.booking.create({ data: { campaignId, locationId, requesterId: user.id, startDate, endDate, quantity, status: "PENDING" } }); }); revalidatePath("/requests"); return { success: `Заявка ${result.id} создана.` }; } catch (error) { return { error: error instanceof Error ? error.message : "Не удалось создать заявку." }; } }
export async function resubmitBooking(bookingId: string) { const user = await requireUser(); const result = await prisma.$transaction(async (tx) => { const booking = await tx.booking.findFirst({ where: { id: bookingId, requesterId: user.id, status: { in: ["REJECTED", "CANCELLED"] } }, include: { location: true } }); if (!booking) throw new Error("Повторно отправить можно только отклонённую или отменённую заявку."); if (!booking.location.isUnlimitedCapacity) { const conflict = await tx.booking.findFirst({ where: { id: { not: booking.id }, locationId: booking.locationId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: booking.endDate }, endDate: { gte: booking.startDate } } }); if (conflict) throw new Error("Точка уже занята в выбранный период."); } const updated = await tx.booking.update({ where: { id: booking.id }, data: { status: "PENDING" } }); await tx.bookingHistory.create({ data: { bookingId: booking.id, actorId: user.id, status: "PENDING", comment: "Повторная отправка после исправления" } }); return updated; }); revalidatePath("/requests"); revalidatePath(`/requests/${result.id}`); return { success: "Заявка повторно отправлена." }; }

export async function resubmitBookingGroup(campaignId: string) {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      const bookings = await tx.booking.findMany({ where: { campaignId, requesterId: user.id }, include: { location: true } });
      if (!bookings.length || bookings.some((booking) => !["REJECTED", "CANCELLED"].includes(booking.status))) throw new Error("Повторно отправить можно весь запрос, если все его блоки отклонены или отменены.");
      const ids = bookings.map((booking) => booking.id);
      for (const booking of bookings) {
        if (booking.location.isUnlimitedCapacity) continue;
        const conflict = await tx.booking.findFirst({ where: { id: { notIn: ids }, locationId: booking.locationId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: booking.endDate }, endDate: { gte: booking.startDate } } });
        if (conflict) throw new Error(`Точка уже занята в выбранный период: ${booking.location.name}.`);
      }
      await tx.booking.updateMany({ where: { id: { in: ids } }, data: { status: "PENDING" } });
      await tx.bookingHistory.createMany({ data: bookings.map((booking) => ({ bookingId: booking.id, actorId: user.id, status: "PENDING" as const, comment: "Весь запрос повторно отправлен после исправления" })) });
    });
    revalidatePath("/requests");
    revalidatePath("/calendar");
    return { success: "Весь запрос повторно отправлен на согласование." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось повторно отправить запрос." };
  }
}

const editSchema = z.object({ bookingId: z.string().min(1), requestName: z.string().trim().min(2).max(200), startDate: z.coerce.date(), endDate: z.coerce.date(), quantity: z.coerce.number().int().positive(), comment: z.string().max(2000).optional() });
export async function editApprovedRequest(formData: FormData) { const user = await requireUser(); const parsed = editSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success || parsed.data.endDate < parsed.data.startDate) return { error: "Проверьте название, даты и количество." }; try { const result = await prisma.$transaction(async (tx) => { const booking = await tx.booking.findFirst({ where: { id: parsed.data.bookingId, requesterId: user.id, status: "APPROVED" }, include: { location: true } }); if (!booking) throw new Error("Редактировать можно только свою одобренную заявку."); if (!booking.location.isUnlimitedCapacity && parsed.data.quantity > (booking.location.capacity ?? 0)) throw new Error("Количество превышает вместимость точки."); if (!booking.location.isUnlimitedCapacity) { const conflict = await tx.booking.findFirst({ where: { id: { not: booking.id }, locationId: booking.locationId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: parsed.data.endDate }, endDate: { gte: parsed.data.startDate } } }); if (conflict) throw new Error("Точка занята в выбранный период."); } const updated = await tx.booking.update({ where: { id: booking.id }, data: { startDate: parsed.data.startDate, endDate: parsed.data.endDate, quantity: parsed.data.quantity, comment: parsed.data.comment, status: "PENDING" } }); await tx.campaign.update({ where: { id: booking.campaignId }, data: { title: parsed.data.requestName, startDate: parsed.data.startDate, endDate: parsed.data.endDate } }); await tx.bookingHistory.create({ data: { bookingId: booking.id, actorId: user.id, status: "PENDING", comment: "Заявка изменена и отправлена на повторное согласование" } }); return updated; }); revalidatePath("/requests"); revalidatePath(`/requests/${result.id}`); return { success: "Изменения отправлены на повторное согласование." }; } catch (error) { return { error: error instanceof Error ? error.message : "Не удалось изменить заявку." }; } }

export async function deleteRequest(bookingId: string) { const user = await requireUser(); try { await prisma.$transaction(async (tx) => { const booking = await tx.booking.findFirst({ where: user.role === "ADMIN" ? { id: bookingId } : { id: bookingId, requesterId: user.id }, select: { campaignId: true } }); if (!booking) throw new Error("Запрос не найден."); await tx.campaign.delete({ where: { id: booking.campaignId } }); }); revalidatePath("/requests"); return { success: "Запрос удалён." }; } catch (error) { return { error: error instanceof Error ? error.message : "Не удалось удалить запрос." }; } }
export async function editApprovedRequestAction(formData: FormData): Promise<void> { await editApprovedRequest(formData); }
