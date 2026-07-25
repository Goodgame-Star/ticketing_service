import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Cloudflare R2 uses S3-compatible API
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID || "dummy"}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "dummy",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "dummy",
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "dummy";
const PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://dummy";

/** MIME type → file extension mapping (shared across actions) */
export const MIME_TO_EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "video/webm": "webm",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
};

/**
 * Upload a File object to Cloudflare R2.
 * @param file  The File to upload (from FormData)
 * @param path  The object key / path inside the bucket (e.g. "ticketId/filename.webp")
 * @returns     The full public URL to the uploaded object
 */
export async function uploadToR2(file: File, path: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
      Body: buffer,
      ContentType: file.type,
    })
  );

  return `${PUBLIC_URL}/${path}`;
}

/**
 * Upload a raw Buffer to Cloudflare R2.
 * Useful for re-uploading existing files fetched from another storage provider.
 */
export async function uploadBufferToR2(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${PUBLIC_URL}/${path}`;
}

/** Derive file type category from MIME type */
export function getFileType(mimeType: string): "image" | "video" | "pdf" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "pdf";
}

/** Derive file extension from MIME type or filename */
export function getExt(mimeType: string, filename: string): string {
  return MIME_TO_EXT[mimeType] || filename.split(".").pop()?.toLowerCase() || "bin";
}
