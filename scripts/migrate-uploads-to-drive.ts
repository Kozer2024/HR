import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { storageDirectory } from "../src/lib/storage";
import { storeUploadedFile, isDriveStoredName } from "../src/lib/drive-storage";
import { detectImage, isPdf } from "../src/lib/file-signatures";

const locations = await prisma.location.findMany({ select: { id: true, photoUrls: true } });
const tasks = await prisma.executionTask.findMany({ where: { reportUrl: { not: null } }, select: { id: true, reportUrl: true } });
const names = new Set<string>();
for (const location of locations) for (const url of location.photoUrls) {
  const name = url.split("/").at(-1);
  if (name && !isDriveStoredName(name)) names.add(name);
}
for (const task of tasks) {
  const name = task.reportUrl?.split("/").at(-1);
  if (name && !isDriveStoredName(name)) names.add(name);
}

try {
  const replacements = new Map<string, string>();
  for (const name of names) {
    const data = await readFile(path.join(storageDirectory, name));
    const image = detectImage(data);
    const pdf = isPdf(data);
    if (!image && !pdf) throw new Error(`Неподдерживаемый файл в storage: ${name}`);
    const nextName = await storeUploadedFile(name, data, image?.contentType ?? "application/pdf");
    replacements.set(name, `/api/files/${nextName}`);
    console.log(`Перенесён файл: ${name}`);
  }
  for (const location of locations) {
    const next = location.photoUrls.map((url) => replacements.get(url.split("/").at(-1) ?? "") ?? url);
    if (next.some((url, index) => url !== location.photoUrls[index])) await prisma.location.update({ where: { id: location.id }, data: { photoUrls: next } });
  }
  for (const task of tasks) {
    const name = task.reportUrl?.split("/").at(-1) ?? "";
    const next = replacements.get(name);
    if (next) await prisma.executionTask.update({ where: { id: task.id }, data: { reportUrl: next } });
  }
  console.log(`Готово. Перенесено файлов: ${replacements.size}. Исходники на сервере оставлены как резервная копия.`);
} finally {
  await prisma.$disconnect();
}
