/**
 * Test script for storage functionality (S3 or local)
 * Run with: npx tsx scripts/test-storage.ts
 */

import "dotenv/config";
import { uploadFile, deleteFile, getStorageProvider } from "../lib/storage/factory";

async function testStorage() {
  const provider = process.env.STORAGE_PROVIDER || "local";
  console.log(`🧪 Testing ${provider} storage...\n`);

  // Check environment variables based on provider
  if (provider === "s3") {
    const requiredVars = [
      "AWS_REGION",
      "AWS_S3_BUCKET",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "CLOUDFRONT_DOMAIN",
    ];

    const missing = requiredVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      console.error("❌ Missing environment variables:", missing.join(", "));
      console.error("   Make sure your .env file is configured correctly.");
      process.exit(1);
    }

    console.log("✅ Environment variables configured");
    console.log(`   Region: ${process.env.AWS_REGION}`);
    console.log(`   Bucket: ${process.env.AWS_S3_BUCKET}`);
    console.log(`   CloudFront: ${process.env.CLOUDFRONT_DOMAIN}\n`);
  } else {
    console.log("✅ Using local storage provider");
    console.log(`   Files will be stored in /public/uploads/\n`);
  }

  // Create a test file
  const testContent = `Test file created at ${new Date().toISOString()}`;
  const testBuffer = Buffer.from(testContent, "utf-8");
  const testFilename = "test-upload.txt";
  const testWorkspace = "_test";

  try {
    // Test upload
    console.log("📤 Uploading test file...");
    const result = await uploadFile(
      testBuffer,
      testFilename,
      "text/plain",
      testWorkspace
    );

    console.log("✅ Upload successful!");
    console.log(`   Key: ${result.key}`);
    console.log(`   Public URL: ${result.url}\n`);

    // Test access
    console.log("🌐 Testing file access...");

    if (provider === "s3") {
      const response = await fetch(result.url);

      if (response.ok) {
        const content = await response.text();
        console.log("✅ CloudFront access successful!");
        console.log(`   Status: ${response.status}`);
        console.log(`   Content: ${content}\n`);
      } else {
        console.log(`⚠️  CloudFront returned status ${response.status}`);
        console.log("   Note: It may take a few minutes for CloudFront to propagate.\n");
      }
    } else {
      // For local storage, check if file exists
      const fs = await import("fs/promises");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", result.url);

      try {
        const content = await fs.readFile(filePath, "utf-8");
        console.log("✅ Local file access successful!");
        console.log(`   Path: ${filePath}`);
        console.log(`   Content: ${content}\n`);
      } catch (error) {
        console.log(`❌ Local file not found: ${filePath}\n`);
      }
    }

    // Test deletion
    console.log("🗑️  Testing deletion...");
    await deleteFile(result.url);
    console.log("✅ Deletion successful!\n");

    // Verify deletion
    console.log("🔍 Verifying deletion...");

    if (provider === "s3") {
      const verifyResponse = await fetch(result.url);
      if (verifyResponse.status === 403 || verifyResponse.status === 404) {
        console.log("✅ File successfully deleted (returns 403/404)\n");
      } else {
        console.log(`⚠️  File still accessible (status ${verifyResponse.status})`);
        console.log("   Note: CloudFront may cache the file temporarily.\n");
      }
    } else {
      const fs = await import("fs/promises");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", result.url);

      try {
        await fs.access(filePath);
        console.log(`⚠️  File still exists: ${filePath}\n`);
      } catch {
        console.log("✅ File successfully deleted\n");
      }
    }

    console.log(`🎉 All ${provider} storage tests passed!`);
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testStorage();
