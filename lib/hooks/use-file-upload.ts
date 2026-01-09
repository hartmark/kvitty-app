"use client";

import { useState, useCallback } from "react";
import { getPresignedUrl } from "@/lib/actions/upload";

interface UploadOptions {
  workspaceSlug: string;
}

interface UploadResult {
  url: string; // Public URL (CloudFront or /uploads/...)
  key: string;
}

/**
 * Hook for uploading files to storage (S3 or local filesystem)
 *
 * Works with both storage providers:
 * - S3: Uploads directly to S3 using presigned URL (PUT request)
 * - Local: Uploads to API endpoint (POST request)
 *
 * @returns Object with upload function, loading state, and error state
 */
export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, options: UploadOptions): Promise<UploadResult> => {
      setIsUploading(true);
      setError(null);

      try {
        // Step 1: Get upload URL via server action (presigned URL or API endpoint)
        const { presignedUrl, cloudFrontUrl, key } = await getPresignedUrl({
          filename: file.name,
          contentType: file.type,
          workspaceSlug: options.workspaceSlug,
          fileSize: file.size,
        });

        // Step 2: Upload file
        // For S3: presignedUrl is an https:// URL, use PUT
        // For local: presignedUrl is a /api/upload endpoint, use POST
        const isPresignedUrl = presignedUrl.startsWith("http");

        const uploadResponse = await fetch(presignedUrl, {
          method: isPresignedUrl ? "PUT" : "POST",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file to storage");
        }

        // Return public URL (cloudFrontUrl for S3, /uploads URL for local)
        return { url: cloudFrontUrl, key };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  return { upload, isUploading, error };
}

/**
 * @deprecated Use useFileUpload instead
 * Kept for backward compatibility
 */
export const useS3Upload = useFileUpload;
