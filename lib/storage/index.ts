/**
 * Storage Abstraction Layer
 *
 * Provides a unified interface for file storage across different providers.
 * Supports local filesystem and AWS S3 with CloudFront.
 */

// Export types
export type {
  StorageProvider,
  StorageProviderType,
  UploadResult,
  PresignedUrlResult,
} from "./types";

// Export factory and convenience functions
export {
  getStorageProvider,
  uploadFile,
  getUploadUrl,
  deleteFile,
} from "./factory";

// Export providers (for testing and advanced use cases)
export { S3StorageProvider } from "./providers/s3-provider";
export { LocalStorageProvider } from "./providers/local-provider";
