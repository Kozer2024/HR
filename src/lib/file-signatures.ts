export function detectImage(data: Buffer) {
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { extension: ".png", contentType: "image/png" };
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { extension: ".jpg", contentType: "image/jpeg" };
  if (/^GIF8[79]a$/.test(data.subarray(0, 6).toString("ascii"))) return { extension: ".gif", contentType: "image/gif" };
  if (data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP") return { extension: ".webp", contentType: "image/webp" };
  return null;
}

export function isPdf(data: Buffer) {
  return data.subarray(0, 5).toString("ascii") === "%PDF-";
}
