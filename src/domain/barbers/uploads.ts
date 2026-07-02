import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { ValidationError } from "@/domain/errors";

/**
 * Server-only image storage for barber photos. Files live OUTSIDE public/
 * (which is snapshotted at build time) and are served by
 * /api/uploads/[name]. Names are always `<uuid>.<ext>`, which both prevents
 * path traversal and makes immutable caching safe (replacement = new name).
 */

export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? join(process.cwd(), "uploads");

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const FILE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Validate and persist an uploaded image; returns the generated filename. */
export async function saveUpload(file: File): Promise<string> {
  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    throw new ValidationError("Only JPEG, PNG, or WebP images are allowed.");
  }
  if (file.size === 0) throw new ValidationError("The file is empty.");
  if (file.size > MAX_BYTES) {
    throw new ValidationError("Images must be 5MB or smaller.");
  }

  const name = `${randomUUID()}.${ext}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(join(UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

/** Remove a stored file; missing files are fine (row already gone, etc.). */
export async function deleteUpload(name: string): Promise<void> {
  if (!FILE_NAME_PATTERN.test(name)) return;
  try {
    await unlink(join(UPLOADS_DIR, name));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
