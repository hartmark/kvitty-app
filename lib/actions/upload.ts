"use server";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUploadUrl as getStorageUploadUrl } from "@/lib/storage";
import {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  getFileExtension,
} from "@/lib/utils/upload-constants";

interface GetPresignedUrlInput {
  filename: string;
  contentType: string;
  workspaceSlug: string;
  fileSize?: number;
}

interface GetPresignedUrlResult {
  presignedUrl: string; // For S3: presigned URL, for local: API endpoint
  cloudFrontUrl: string; // For S3: CloudFront URL, for local: /uploads URL
  key: string;
}

export async function getPresignedUrl(
  input: GetPresignedUrlInput
): Promise<GetPresignedUrlResult> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const { filename, contentType, workspaceSlug, fileSize } = input;

  // Validate required fields
  if (!filename || !contentType || !workspaceSlug) {
    throw new Error(
      "Missing required fields: filename, contentType, workspaceSlug"
    );
  }

  // Validate file extension
  const extension = getFileExtension(filename);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(
      `File type not allowed. Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}`
    );
  }

  // Validate content type
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new Error(
      `Content type not allowed. Allowed: ${Array.from(ALLOWED_MIME_TYPES).join(", ")}`
    );
  }

  // Validate file size (if provided)
  if (fileSize && fileSize > MAX_FILE_SIZE) {
    throw new Error(
      `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    );
  }

  // Verify workspace exists and user is a member
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, workspaceSlug),
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspace.id),
      eq(workspaceMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    throw new Error("Not a member of this workspace");
  }

  // Use storage provider to generate upload URL
  const result = await getStorageUploadUrl(filename, contentType, workspaceSlug);

  return {
    presignedUrl: result.uploadUrl,
    cloudFrontUrl: result.publicUrl,
    key: result.key,
  };
}
