import path from "path";

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".csv",
  ".xls",
  ".xlsx",
]);

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}
