import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createCuid } from "@/lib/utils/cuid";
import type {
  StorageProvider,
  UploadResult,
  PresignedUrlResult,
} from "../types";

const CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * S3 Storage Provider
 *
 * Stores files in AWS S3 with CloudFront CDN distribution.
 * Requires AWS credentials and CloudFront domain in environment variables.
 */
export class S3StorageProvider implements StorageProvider {
  private s3Client: S3Client;
  private bucket: string;
  private cloudFrontDomain: string;

  constructor() {
    // Validate required environment variables
    if (!process.env.AWS_REGION) {
      throw new Error("AWS_REGION environment variable is required for S3 storage");
    }
    if (!process.env.AWS_S3_BUCKET) {
      throw new Error("AWS_S3_BUCKET environment variable is required for S3 storage");
    }
    if (!process.env.AWS_ACCESS_KEY_ID) {
      throw new Error("AWS_ACCESS_KEY_ID environment variable is required for S3 storage");
    }
    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error("AWS_SECRET_ACCESS_KEY environment variable is required for S3 storage");
    }
    if (!process.env.CLOUDFRONT_DOMAIN) {
      throw new Error("CLOUDFRONT_DOMAIN environment variable is required for S3 storage");
    }

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    this.bucket = process.env.AWS_S3_BUCKET;
    this.cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
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
   * Upload a file to S3 from a buffer
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    contentType: string,
    workspaceSlug: string
  ): Promise<UploadResult> {
    const key = this.generateKey(filename, workspaceSlug);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: CACHE_CONTROL,
    });

    await this.s3Client.send(command);

    const url = `https://${this.cloudFrontDomain}/${key}`;

    return {
      url,
      key,
    };
  }

  /**
   * Generate a presigned URL for client-side upload to S3
   */
  async getUploadUrl(
    filename: string,
    contentType: string,
    workspaceSlug: string
  ): Promise<PresignedUrlResult> {
    const key = this.generateKey(filename, workspaceSlug);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      CacheControl: CACHE_CONTROL,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 300, // 5 minutes
    });

    const publicUrl = `https://${this.cloudFrontDomain}/${key}`;

    return {
      uploadUrl,
      publicUrl,
      key,
    };
  }

  /**
   * Delete a file from S3 using its CloudFront URL
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const url = new URL(fileUrl);
      const key = url.pathname.slice(1); // Remove leading slash

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error("Failed to delete from S3:", error);
      throw error;
    }
  }
}
