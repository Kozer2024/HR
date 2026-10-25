import { auth } from "@/lib/auth";
import { storageDirectory } from "@/lib/storage";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
export const runtime = "nodejs";
export async function POST(request: Request) { const session = await auth(); if (!session?.user) return Response.json({ error: "Необходима авторизация" }, { status: 401 }); const formData = await request.formData(); const file = formData.get("file"); if (!(file instanceof File) || file.size > 10 * 1024 * 1024) return Response.json({ error: "Файл не найден или превышает 10 МБ" }, { status: 400 }); const safeName = file.name.replace(/[^a-zA-Z0-9а-яА-Я._-]/g, "_"); const storedName = `${crypto.randomUUID()}-${safeName}`; await mkdir(storageDirectory, { recursive: true }); await writeFile(path.join(storageDirectory, storedName), Buffer.from(await file.arrayBuffer())); return Response.json({ url: `/api/files/${storedName}` }); }
