import crypto from "node:crypto";

const DRIVE_FOLDER_NAME = "HR BMSTU photos and reports";
let cachedAccessToken: { value: string; expiresAt: number } | null = null;
let cachedFolderId: string | null = null;

function driveConfig() {
  const clientId = process.env.GDRIVE_CLIENT_ID?.trim();
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GDRIVE_REFRESH_TOKEN?.trim();
  const supplied = [clientId, clientSecret, refreshToken].filter(Boolean).length;
  if (supplied === 0) return null;
  if (supplied !== 3) throw new Error("Google Drive is not fully configured.");
  return { clientId: clientId!, clientSecret: clientSecret!, refreshToken: refreshToken! };
}
export function isDriveStoredName(name: string) {
  return /^gdrive-[a-zA-Z0-9_-]{10,200}\.(?:png|jpe?g|webp|gif|pdf)$/i.test(name);
}

export async function storeUploadedFile(name: string, data: Buffer, mimeType: string) {
  const config = driveConfig();
  if (!config) return name;
  const token = await getAccessToken(config);
  const folderId = await getFolderId(token);
  const metadata = { name, parents: [folderId], appProperties: { app: "hr-bmstu" } };
  const boundary = `hr_${crypto.randomBytes(18).toString("hex")}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    data,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error("Google Drive did not accept the uploaded file.");
  const result = await response.json() as { id?: string };
  if (!result.id || !/^[a-zA-Z0-9_-]{10,200}$/.test(result.id)) throw new Error("Google Drive returned an invalid file identifier.");
  return `gdrive-${result.id}${name.slice(name.lastIndexOf("."))}`;
}

export async function readDriveFile(name: string) {
  if (!isDriveStoredName(name)) throw new Error("Invalid Google Drive file reference.");
  const config = driveConfig();
  if (!config) throw new Error("Google Drive is not configured.");
  const id = name.slice("gdrive-".length, name.lastIndexOf("."));
  const token = await getAccessToken(config);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("Google Drive file is unavailable.");
  const data = Buffer.from(await response.arrayBuffer());
  if (!data.length || data.length > 20 * 1024 * 1024) throw new Error("Stored file exceeds the allowed size.");
  return data;
}

async function getAccessToken(config: { clientId: string; clientSecret: string; refreshToken: string }) {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) return cachedAccessToken.value;
  const form = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: config.refreshToken, grant_type: "refresh_token" });
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("Google Drive authorization expired or was rejected.");
  const result = await response.json() as { access_token?: string; expires_in?: number };
  if (!result.access_token) throw new Error("Google Drive returned no access token.");
  cachedAccessToken = { value: result.access_token, expiresAt: Date.now() + (result.expires_in ?? 3600) * 1000 };
  return result.access_token;
}

async function getFolderId(accessToken: string) {
  if (cachedFolderId) return cachedFolderId;
  const query = new URLSearchParams({ q: `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`, fields: "files(id)", pageSize: "1" });
  const search = await fetch(`https://www.googleapis.com/drive/v3/files?${query}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15_000) });
  if (!search.ok) throw new Error("Could not locate the app folder in Google Drive.");
  const result = await search.json() as { files?: Array<{ id?: string }> };
  if (result.files?.[0]?.id) {
    cachedFolderId = result.files[0].id;
    return cachedFolderId;
  }
  const create = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder", appProperties: { app: "hr-bmstu" } }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!create.ok) throw new Error("Could not create the app folder in Google Drive.");
  const folder = await create.json() as { id?: string };
  if (!folder.id) throw new Error("Google Drive returned no folder identifier.");
  cachedFolderId = folder.id;
  return folder.id;
}
