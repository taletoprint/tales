-- Add S3 upload status fields to Preview table
ALTER TABLE "Preview" ADD COLUMN "s3ImageUrl" TEXT;
ALTER TABLE "Preview" ADD COLUMN "s3UploadStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Preview" ADD COLUMN "s3UploadAttempts" INTEGER NOT NULL DEFAULT 0;

-- Create index for s3UploadStatus
CREATE INDEX "Preview_s3UploadStatus_idx" ON "Preview"("s3UploadStatus");

-- Create S3UploadQueue table
CREATE TABLE "S3UploadQueue" (
    "id" TEXT NOT NULL,
    "previewId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "contentType" TEXT,
    "contentLength" INTEGER,
    "s3Key" TEXT,
    "s3ETag" TEXT,

    CONSTRAINT "S3UploadQueue_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint and indexes
CREATE UNIQUE INDEX "S3UploadQueue_previewId_key" ON "S3UploadQueue"("previewId");
CREATE INDEX "S3UploadQueue_status_nextRunAt_idx" ON "S3UploadQueue"("status", "nextRunAt");
CREATE INDEX "S3UploadQueue_previewId_idx" ON "S3UploadQueue"("previewId");
CREATE INDEX "S3UploadQueue_createdAt_idx" ON "S3UploadQueue"("createdAt");

-- Add foreign key constraint
ALTER TABLE "S3UploadQueue" ADD CONSTRAINT "S3UploadQueue_previewId_fkey" FOREIGN KEY ("previewId") REFERENCES "Preview"("id") ON DELETE CASCADE ON UPDATE CASCADE;