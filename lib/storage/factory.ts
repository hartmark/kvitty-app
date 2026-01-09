import type { StorageProvider, StorageProviderType } from "./types";
import { S3StorageProvider } from "./providers/s3-provider";
import { LocalStorageProvider } from "./providers/local-provider";

/**
 * Singleton storage provider instance
 */
let _storageProvider: StorageProvider | null = null;

/**
 * Get the configured storage provider
 *
 * Provider is selected based on STORAGE_PROVIDER environment variable.
 * Defaults to "local" if not specified.
 *
 * @returns Singleton storage provider instance
 */
export function getStorageProvider(): StorageProvider {
  if (_storageProvider) {
    return _storageProvider;
  }

  const providerType = (process.env.STORAGE_PROVIDER || "local") as StorageProviderType;

  switch (providerType) {
    case "s3":
      _storageProvider = new S3StorageProvider();
      break;
    case "local":
      _storageProvider = new LocalStorageProvider();
      break;
    default:
      throw new Error(
        `Unknown storage provider: ${providerType}. Supported providers: local, s3`
      );
  }

  return _storageProvider;
}

/**
 * Convenience function: Upload a file from a buffer
 */
export const uploadFile = (
  buffer: Buffer,
  filename: string,
  contentType: string,
  workspaceSlug: string
) => getStorageProvider().uploadFile(buffer, filename, contentType, workspaceSlug);

/**
 * Convenience function: Generate an upload URL for client-side uploads
 */
export const getUploadUrl = (
  filename: string,
  contentType: string,
  workspaceSlug: string
) => getStorageProvider().getUploadUrl(filename, contentType, workspaceSlug);

/**
 * Convenience function: Delete a file by its URL
 */
export const deleteFile = (fileUrl: string) =>
  getStorageProvider().deleteFile(fileUrl);
