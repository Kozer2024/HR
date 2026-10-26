import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageDirectory } from "@/lib/storage";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import readXlsxFile from "read-excel-file/node";
import AdmZip from "adm-zip";
import { z } from "zod";
import { detectImage } from "@/lib/file-signatures";
import { isSameOriginRequest } from "@/lib/request-security";

export const runtime = "nodejs";
const MAX_SHEET_BYTES = 20 * 1024 * 1024;
const MAX_ZIP_BYTES = 30 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 100 * 1024 * 1024;
const MAX_IMPORT_ROWS = 2000;
const MAX_ARCHIVE_ENTRIES = 5000;

const rowSchema = z.object({
  externalId: z.string().trim().min(1).max(120),
  campus: z.string().trim().min(1).max(120),
  building: z.string().trim().min(1).max(120),
  floor: z.coerce.number().int().min(-5).max(200),
  name: z.string().trim().min(1).max(200),
  type: z.enum(["POSTER", "PRISM", "BANNER", "TELEVISION", "LED_DISPLAY"]),
  capacity: z.union([z.coerce.number().int().positive().max(100000), z.literal("Не ограничена")]).optional(),
  description: z.string().max(3000).optional(),
  dimensions: z.string().max(200).optional(),
  photo: z.string().max(255).optional(),
});

function cellText(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ",") { row.push(cell); cell = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((item) => item.trim())) rows.push(row);
      row = [];
      if (rows.length > MAX_IMPORT_ROWS + 1) throw new Error("В файле больше 2000 строк.");
    } else cell += char;
  }
  if (quoted) throw new Error("В CSV не закрыта кавычка.");
  row.push(cell);
  if (row.some((item) => item.trim())) rows.push(row);
  if (rows.length > MAX_IMPORT_ROWS + 1) throw new Error("В файле больше 2000 строк.");
  const [header = [], ...data] = rows;
  if (!header.length || header.length > 30) throw new Error("В CSV должно быть от 1 до 30 столбцов.");
  return data.map((values) => Object.fromEntries(header.map((key, index) => [key.trim(), values[index] ?? ""])));
}

function workbookRows(buffer: Buffer) {
  const zip = new AdmZip(buffer);
  const allEntries = zip.getEntries();
  const entries = allEntries.filter((entry) => !entry.isDirectory);
  if (!entries.length || allEntries.length > MAX_ARCHIVE_ENTRIES) throw new Error("Некорректный Excel-файл или слишком много его частей.");
  const unpacked = entries.reduce((sum, entry) => sum + entry.header.size, 0);
  if (unpacked > MAX_UNPACKED_BYTES || entries.some((entry) => entry.header.size > MAX_UNPACKED_BYTES)) throw new Error("Распакованный Excel-файл превышает 100 МБ.");
  return entries;
}

async function readRows(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();
  let records: Record<string, string>[];
  if (fileName.endsWith(".csv")) {
    records = parseCsv(buffer.toString("utf8"));
  } else if (fileName.endsWith(".xlsx")) {
    workbookRows(buffer);
    const sheets = await readXlsxFile(buffer);
    const sheet = sheets[0]?.data;
    if (!sheet || sheet.length < 1 || sheet.length > MAX_IMPORT_ROWS + 1 || sheet.some((row) => row.length > 30)) throw new Error("Excel должен содержать не более 2000 строк и 30 столбцов.");
    const headers = sheet[0].map(cellText);
    if (!headers.length || headers.length > 30) throw new Error("В Excel должно быть от 1 до 30 столбцов.");
    records = [];
    for (const values of sheet.slice(1)) {
      records.push(Object.fromEntries(headers.map((key, column) => [key, cellText(values[column])])));
    }
  } else throw new Error("Поддерживаются только .xlsx и .csv.");

  return records.map((row) => rowSchema.safeParse({
    externalId: value(row, ["external_id", "externalId", "ID", "id"]),
    campus: value(row, ["campus", "Кампус"]),
    building: value(row, ["building", "Корпус"]),
    floor: value(row, ["floor", "Этаж"]),
    name: value(row, ["name", "Название", "Точка"]),
    type: value(row, ["type", "Тип"]).toUpperCase().replace("АФИШИ", "POSTER").replace("ПРИЗМЫ", "PRISM").replace("БАННЕРЫ", "BANNER").replace(/ТЕЛЕВИЗОРЫ?/g, "TELEVISION").replace(/^TV$/g, "TELEVISION").replace(/LED[- ]?ДИСПЛЕИ?/g, "LED_DISPLAY").replace(/(?:ВИДЕО|VIDEO)/g, "LED_DISPLAY"),
    capacity: value(row, ["capacity", "Вместимость"]) || undefined,
    description: value(row, ["description", "Описание"]) || undefined,
    dimensions: value(row, ["dimensions", "Размеры"]) || undefined,
    photo: value(row, ["photo", "Фото"]) || undefined,
  }));
}

function value(row: Record<string, string>, keys: string[]) {
  const key = keys.find((item) => row[item] !== undefined && String(row[item]).trim());
  return key ? String(row[key]).trim() : "";
}

function safePhotoArchive(buffer: Buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const files = entries.filter((entry) => !entry.isDirectory);
  if (entries.length > 1100 || files.length > 1000) throw new Error("В ZIP допускается не более 1000 файлов.");
  let total = 0;
  const photos = new Map<string, { extension: string; data: Buffer }>();
  for (const entry of files) {
    const normalized = path.posix.normalize(entry.entryName.replaceAll("\\", "/"));
    const size = entry.header.size;
    total += size;
    if (normalized.startsWith("../") || normalized.includes("/../") || path.posix.isAbsolute(normalized) || normalized.split("/").length > 2) throw new Error("ZIP содержит недопустимый путь.");
    if (size > 10 * 1024 * 1024 || total > MAX_UNPACKED_BYTES) throw new Error("Размер распакованных фото превышает лимит.");
    const data = entry.getData();
    const detected = detectImage(data);
    if (!detected) throw new Error("ZIP может содержать только PNG, JPEG, GIF и WebP.");
    photos.set(path.posix.basename(normalized), { extension: detected.extension, data });
  }
  return photos;
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" || !session.user.id) return Response.json({ error: "Требуются права администратора" }, { status: 403 });
  if (!isSameOriginRequest(request)) return Response.json({ error: "Недопустимый источник запроса." }, { status: 403 });
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0 || length > MAX_SHEET_BYTES + MAX_ZIP_BYTES + 1024 * 1024) return Response.json({ error: "Размер запроса превышает допустимый лимит." }, { status: 413 });
  if (!(await consumeRateLimit(rateLimitKey("admin-import", session.user.id), 10, 60 * 60 * 1000))) return Response.json({ error: "Слишком много импортов. Попробуйте позже." }, { status: 429 });

  try {
    const form = await request.formData();
    const excel = form.get("excel");
    if (!(excel instanceof File) || excel.size === 0 || excel.size > MAX_SHEET_BYTES) return Response.json({ error: "Загрузите Excel/CSV-файл размером до 20 МБ." }, { status: 400 });
    const parsed = await readRows(excel);
    const errors = parsed.flatMap((row, index) => row.success ? [] : [{ row: index + 2, message: "Проверьте обязательные поля и тип продукции." }]);
    const rows = parsed.flatMap((row) => row.success ? [row.data] : []);
    if (String(form.get("mode") ?? "preview") === "preview" || errors.length) return Response.json({ mode: "preview", total: rows.length, rows: rows.slice(0, 200), errors });

    let photos = new Map<string, { extension: string; data: Buffer }>();
    const zipFile = form.get("photos");
    if (zipFile instanceof File && zipFile.size > 0) {
      if (zipFile.size > MAX_ZIP_BYTES) return Response.json({ error: "ZIP фотографий превышает 30 МБ." }, { status: 400 });
      photos = safePhotoArchive(Buffer.from(await zipFile.arrayBuffer()));
    }

    await mkdir(storageDirectory, { recursive: true });
    let imported = 0;
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const campusId = `import-${row.campus.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-")}`;
        const campus = await tx.campus.upsert({ where: { id: campusId }, update: {}, create: { id: campusId, name: row.campus } });
        const building = await tx.building.upsert({ where: { campusId_name: { campusId: campus.id, name: row.building } }, update: {}, create: { campusId: campus.id, name: row.building } });
        const floor = await tx.floor.upsert({ where: { buildingId_number: { buildingId: building.id, number: row.floor } }, update: {}, create: { buildingId: building.id, number: row.floor } });
        const unlimited = row.capacity === "Не ограничена";
        const location = await tx.location.upsert({ where: { externalId: row.externalId }, update: { name: row.name, type: row.type, capacity: unlimited ? null : Number(row.capacity ?? 1), isUnlimitedCapacity: unlimited, description: row.description, dimensions: row.dimensions, floorId: floor.id }, create: { externalId: row.externalId, name: row.name, type: row.type, capacity: unlimited ? null : Number(row.capacity ?? 1), isUnlimitedCapacity: unlimited, description: row.description, dimensions: row.dimensions, floorId: floor.id } });
        if (row.photo && photos.has(row.photo)) {
          const photo = photos.get(row.photo)!;
          const stored = `${crypto.randomUUID()}${photo.extension}`;
          await writeFile(path.join(storageDirectory, stored), photo.data, { flag: "wx" });
          await tx.location.update({ where: { id: location.id }, data: { photoUrls: { push: `/api/files/${stored}` } } });
        }
        imported++;
      }
    }, { timeout: 30_000 });
    return Response.json({ imported });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось разобрать файл импорта." }, { status: 400 });
  }
}
