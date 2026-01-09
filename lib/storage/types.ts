/**
 * Storage Provider Abstraction
 *
 * Provides a unified interface for file storage across different providers (local, S3, etc.)
 */

/**
 * Result returned after uploading a file
 */
export interface UploadResult {
  /** Full public URL to access the uploaded file */
  url: string;
  /** Storage key/path (e.g., workspaceSlug/cuid/filename) */
  key: string;
}

/**
 * Result returned when generating an upload URL for client-side uploads
 */
export interface PresignedUrlResult {
  /** URL where the client should upload the file (presigned URL or API endpoint) */
  uploadUrl: string;
  /** Public URL where the file will be accessible after upload */
  publicUrl: string;
  /** Storage key/path (e.g., workspaceSlug/cuid/filename) */
  key: string;
}

/**
 * Storage provider interface that all implementations must follow
 */
export interface StorageProvider {
  /**
   * Upload a file from a buffer (server-side upload)
   * @param buffer - File contents as a Buffer
   * @param filename - Original filename
   * @param contentType - MIME type (e.g., 'image/png', 'application/pdf')
   * @param workspaceSlug - Workspace identifier for organization
   * @returns Upload result with public URL and storage key
   */
  uploadFile(
    buffer: Buffer,
    filename: string,
    contentType: string,
    workspaceSlug: string
  ): Promise<UploadResult>;

  /**
   * Generate an upload URL for client-side uploads
   * @param filename - Filename to upload
   * @param contentType - MIME type
   * @param workspaceSlug - Workspace identifier
   * @returns Upload URL (presigned or API endpoint) and final public URL
   */
  getUploadUrl(
    filename: string,
    contentType: string,
    workspaceSlug: string
  ): Promise<PresignedUrlResult>;

  /**
   * Delete a file by its URL
   * @param fileUrl - Full public URL of the file to delete
   */
  deleteFile(fileUrl: string): Promise<void>;
}

/**
 * Available storage provider types
 */
export type StorageProviderType = "local" | "s3";
