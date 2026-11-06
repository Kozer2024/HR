import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { storeUploadedFile } from "@/lib/drive-storage";
import { detectImage } from "@/lib/file-signatures";
import { z } from "zod";

export const runtime = "nodejs";
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const payloadSchema = z.object({
  externalId: z.string().trim().min(1).max(160),
  campus: z.string().trim().min(1).max(120).default("МГТУ им. Н. Э. Баумана"),
  building: z.string().trim().min(1).max(120),
  floor: z.coerce.number().int().min(-5).max(200),
  name: z.string().trim().min(1).max(200),
  type: z.enum(["POSTER", "PRISM", "BANNER", "TELEVISION", "LED_DISPLAY"]),
  description: z.string().trim().max(3000).optional().default(""),
  kafedra: z.string().trim().max(200).optional().default(""),
});

function authorized(request: Request) {
  const configured = process.env.COLLECTOR_TOKEN?.trim();
  const supplied = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Недопустимый токен коллектора." }, { status: 401 });
  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > 12 * 1024 * 1024) return Response.json({ error: "Размер запроса превышает 12 МБ." }, { status: 413 });

  try {
    const form = await request.formData();
    const parsed = payloadSchema.safeParse({
      externalId: form.get("externalId"), campus: form.get("campus") || undefined,
      building: form.get("building"), floor: form.get("floor"), name: form.get("name"),
      type: form.get("type"), description: form.get("description") || undefined, kafedra: form.get("kafedra") || undefined,
    });
    if (!parsed.success) return Response.json({ error: "Проверьте обязательные поля точки." }, { status: 400 });

    const photo = form.get("photo");
    let storedPhoto: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      if (photo.size > MAX_PHOTO_BYTES) return Response.json({ error: "Фото должно быть не больше 10 МБ." }, { status: 400 });
      const data = Buffer.from(await photo.arrayBuffer());
      const detected = detectImage(data);
      if (!detected) return Response.json({ error: "Поддерживаются PNG, JPEG, GIF и WebP." }, { status: 400 });
      storedPhoto = await storeUploadedFile(`${crypto.randomUUID()}${detected.extension}`, data, detected.contentType);
    }

    const input = parsed.data;
    const description = [input.kafedra ? `Кафедра: ${input.kafedra}` : "", input.description].filter(Boolean).join("\n\n") || null;
    const campusId = `collector-${input.campus.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-").replace(/^-|-$/g, "")}`;
    const result = await prisma.$transaction(async (tx) => {
      const campus = await tx.campus.upsert({ where: { id: campusId }, update: {}, create: { id: campusId, name: input.campus } });
      const building = await tx.building.upsert({ where: { campusId_name: { campusId: campus.id, name: input.building } }, update: {}, create: { campusId: campus.id, name: input.building } });
      const floor = await tx.floor.upsert({ where: { buildingId_number: { buildingId: building.id, number: input.floor } }, update: {}, create: { buildingId: building.id, number: input.floor } });
      return tx.location.upsert({
        where: { externalId: input.externalId },
        update: { name: input.name, type: input.type, capacity: 1, isUnlimitedCapacity: false, description, floorId: floor.id, ...(storedPhoto ? { photoUrls: [`/api/files/${storedPhoto}`] } : {}) },
        create: { externalId: input.externalId, name: input.name, type: input.type, capacity: 1, isUnlimitedCapacity: false, description, floorId: floor.id, photoUrls: storedPhoto ? [`/api/files/${storedPhoto}`] : [] },
        select: { id: true, externalId: true, name: true, photoUrls: true },
      });
    });
    return Response.json({ success: true, location: result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось загрузить точку." }, { status: 400 });
  }
}
