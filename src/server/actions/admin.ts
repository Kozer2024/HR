"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/server/services/telegram";

export async function approveUser(userId: string) { const admin = await requireRole("ADMIN"); const user = await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } }); await prisma.notification.create({ data: { userId, title: "Доступ подтверждён", body: "Администратор подтвердил вашу учётную запись.", type: "SUCCESS" } }); await sendTelegramMessage(user.telegramChatId, "PRoject: ваша учётная запись подтверждена."); await prisma.auditLog.create({ data: { userId: admin.id, action: "APPROVE_USER", entity: "User", entityId: userId } }); revalidatePath("/admin/users"); }

export async function deleteUser(userId: string) { const admin = await requireRole("ADMIN"); if (admin.id === userId) return { error: "Нельзя удалить текущую учётную запись администратора." }; try { await prisma.$transaction(async (tx) => { const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true } }); if (!user) throw new Error("Пользователь не найден."); if (user.role === "ADMIN") throw new Error("Учётные записи администраторов нельзя удалить."); await tx.campaign.deleteMany({ where: { ownerId: userId } }); await tx.booking.deleteMany({ where: { requesterId: userId } }); await tx.executionTask.deleteMany({ where: { executorId: userId } }); await tx.notification.deleteMany({ where: { userId } }); await tx.user.delete({ where: { id: userId } }); await tx.auditLog.create({ data: { userId: admin.id, action: "DELETE_USER", entity: "User", entityId: userId } }); }); revalidatePath("/admin/users"); return { success: "Пользователь удалён." }; } catch (error) { return { error: error instanceof Error ? error.message : "Не удалось удалить пользователя." }; } }

export async function reviewBooking(bookingId: string, approved: boolean) { const admin = await requireRole("ADMIN"); const status = approved ? "APPROVED" : "REJECTED"; const booking = await prisma.$transaction(async (tx) => { const updated = await tx.booking.update({ where: { id: bookingId }, data: { status }, include: { requester: true } }); await tx.bookingHistory.create({ data: { bookingId, actorId: admin.id, status, comment: approved ? "Одобрено администратором" : "Отклонено администратором" } }); return updated; }); await prisma.notification.create({ data: { userId: booking.requesterId, title: approved ? "Заявка одобрена" : "Заявка отклонена", body: `Заявка ${booking.id} получила новый статус.`, type: approved ? "SUCCESS" : "WARNING" } }); await sendTelegramMessage(booking.requester.telegramChatId, `PRoject: заявка ${booking.id} ${approved ? "одобрена" : "отклонена"}.`); await prisma.auditLog.create({ data: { userId: admin.id, action: approved ? "APPROVE_BOOKING" : "REJECT_BOOKING", entity: "Booking", entityId: bookingId } }); revalidatePath("/requests"); revalidatePath(`/requests/${bookingId}`); }

export async function reviewBookingGroup(campaignId: string, approved: boolean) {
  const admin = await requireRole("ADMIN");
  const status = approved ? "APPROVED" : "REJECTED";
  const bookings = await prisma.$transaction(async (tx) => {
    const pending = await tx.booking.findMany({ where: { campaignId, status: "PENDING" }, include: { requester: true, campaign: true } });
    if (pending.length === 0) return [];
    for (const booking of pending) {
      await tx.booking.update({ where: { id: booking.id }, data: { status } });
      await tx.bookingHistory.create({ data: { bookingId: booking.id, actorId: admin.id, status, comment: approved ? "Весь запрос одобрен администратором" : "Весь запрос отклонён администратором" } });
    }
    return pending;
  });
  if (bookings.length) {
    const requester = bookings[0].requester;
    await prisma.notification.create({ data: { userId: requester.id, title: approved ? "Запрос одобрен" : "Запрос отклонён", body: `Запрос «${bookings[0].campaign.title}» обработан целиком.`, type: approved ? "SUCCESS" : "WARNING" } });
    await sendTelegramMessage(requester.telegramChatId, `PRoject: ваш запрос ${approved ? "одобрен" : "отклонён"} целиком.`);
    await prisma.auditLog.create({ data: { userId: admin.id, action: approved ? "APPROVE_BOOKING_GROUP" : "REJECT_BOOKING_GROUP", entity: "Campaign", entityId: campaignId } });
  }
  revalidatePath("/requests");
  revalidatePath("/calendar");
}
