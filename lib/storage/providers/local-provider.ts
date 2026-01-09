import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { createCuid } from "@/lib/utils/cuid";
import type {
  StorageProvider,
  UploadResult,
  PresignedUrlResult,
} from "../types";

/**
 * Local File System Storage Provider
 *
 * Stores files in the local filesystem under /public/uploads/.
 * Files are publicly accessible via /uploads/* URLs.
 * Ideal for development and self-hosted deployments.
 */
export class LocalStorageProvider implements StorageProvider {
  private uploadsDir: string;
  private publicPath: string;

  constructor() {
    // Files stored in /public/uploads/
    this.uploadsDir = path.join(process.cwd(), "public", "uploads");
    // Public URL path
    this.publicPath = "/uploads";
  }

  /**
   * Sanitize filename by removing special characters
   */
  private sanitizeFilename(filename: string): string {
    const basename = filename.split("/").pop() || filename;
    return basename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  }

  /**
   * Generate storage key with workspace isolation
   */
  private generateKey(filename: string, workspaceSlug: string): string {
    const safeFilename = this.sanitizeFilename(filename);
    const uniqueId = createCuid();
    return `${workspaceSlug}/${uniqueId}/${safeFilename}`;
  }

  /**
   * Ensure directory exists, creating it if necessary
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Ignore EEXIST errors
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }
  }

  /**
   * Upload a file from a buffer to local filesystem
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    contentType: string,
    workspaceSlug: string
  ): Promise<UploadResult> {
    const key = this.generateKey(filename, workspaceSlug);
    const filePath = path.join(this.uploadsDir, key);
    const fileDir = path.dirname(filePath);

    // Ensure directory exists
    await this.ensureDirectory(fileDir);

    // Write file
    await writeFile(filePath, buffer);

    const url = `${this.publicPath}/${key}`;

    return {
      url,
      key,
    };
  }

  /**
   * Generate an upload URL for client-side uploads
   * For local storage, this returns an API endpoint URL
   */
  async getUploadUrl(
    filename: string,
    contentType: string,
    workspaceSlug: string
  ): Promise<PresignedUrlResult> {
    const key = this.generateKey(filename, workspaceSlug);

    // For local storage, client uploads to our API endpoint
    const uploadUrl = `/api/upload?key=${encodeURIComponent(key)}&workspaceSlug=${encodeURIComponent(workspaceSlug)}`;
    const publicUrl = `${this.publicPath}/${key}`;

    return {
      uploadUrl,
      publicUrl,
      key,
    };
  }

  /**
   * Delete a file from local filesystem using its URL
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract path from URL (e.g., /uploads/workspace/cuid/file.pdf)
      let filePath: string;

      if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
        // Full URL - extract pathname
        const url = new URL(fileUrl);
        filePath = url.pathname;
      } else {
        // Already a path
        filePath = fileUrl;
      }

      // Remove leading /uploads/ to get the key
      const key = filePath.replace(/^\/uploads\//, "");

      // Convert to filesystem path
      const fullPath = path.join(this.uploadsDir, key);

      // Delete file
      await unlink(fullPath);
    } catch (error) {
      console.error("Failed to delete from local storage:", error);
      // Don't throw - graceful degradation for missing files
      // This matches the behavior of S3 provider
    }
  }
}
