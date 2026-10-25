import path from "node:path";

/** Configure FILE_STORAGE_PATH to point at a mounted persistent volume in production. */
export const storageDirectory = path.resolve(
  /*turbopackIgnore: true*/ process.env.FILE_STORAGE_PATH || path.join(process.cwd(), "storage"),
);
