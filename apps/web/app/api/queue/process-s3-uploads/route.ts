import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PassThrough } from 'stream';
import { prisma } from '@/lib/prisma';
import { PreviewMetadata } from '@taletoprint/ai-pipeline/src/shared/storage';
const s3 = new S3Client({ 
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 6;

interface QueueJob {
  id: string;
  previewId: string;
  imageUrl: string;
  attempts: number;
  contentType?: string | null;
  s3Key?: string | null;
  preview?: {
    story: string;
    style: string;
    prompt: string;
    createdAt: Date;
  } | null;
}

/**
 * Calculate exponential backoff delay
 * 1m, 5m, 15m, 1h, 6h, 24h cap
 */
function nextDelayMs(attempts: number): number {
  const schedule = [60e3, 5*60e3, 15*60e3, 3600e3, 6*3600e3, 24*3600e3];
  return schedule[Math.min(attempts, schedule.length - 1)];
}

/**
 * Upload metadata file to S3
 */
async function uploadMetadataToS3(job: QueueJob): Promise<string> {
  if (!job.preview) {
    throw new Error('Preview metadata is required');
  }

  const timestamp = job.preview.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
  const metadataKey = `previews/${timestamp}/${job.previewId}_metadata.json`;

  // Create metadata object matching the expected format
  const metadata: PreviewMetadata = {
    previewId: job.previewId,
    generatedAt: job.preview.createdAt.toISOString(),
    originalStory: job.preview.story,
    requestedStyle: job.preview.style,
    requestedAspect: 'portrait', // Default - we could enhance this later
    refinedPrompt: job.preview.prompt,
    negativePrompt: '', // Not stored currently
    openaiEnhanced: true, // Assume true for recent previews
    model: 'flux-dev-lora', // Default for recent previews
    routingReason: 'Style-based routing',
    hasPeople: false, // Could be enhanced
    loraUsed: true, // Assume true for flux-dev-lora
    modelVersion: 'latest',
    steps: 28,
    seed: Math.floor(Math.random() * 1000000),
    dimensions: { width: 1024, height: 1024 }, // Default
    generationTimeMs: 15000, // Approximate
    estimatedCost: 0.055,
    phase: 'production',
    replicateUrl: job.imageUrl,
    styleKeywords: [job.preview.style]
  };

  const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2), 'utf8');
  
  const putCommand = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: metadataKey,
    Body: metadataBuffer,
    ContentType: 'application/json',
    ACL: 'private',
    Metadata: {
      previewId: job.previewId,
      type: 'metadata',
      uploadedAt: new Date().toISOString()
    },
    ServerSideEncryption: 'AES256'
  });

  await s3.send(putCommand);
  console.log(`[S3Queue] Metadata uploaded: ${metadataKey}`);
  
  return metadataKey;
}

/**
 * Stream image from URL to S3
 */
async function streamToS3(job: QueueJob): Promise<{ s3Key: string; etag: string; contentType: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
  try {
    // Fetch image from Replicate
    const response = await fetch(job.imageUrl, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'TaleToPrint/1.0 (+https://taletoprint.com)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }
    
    if (!response.body) {
      throw new Error('No response body received');
    }

    // Determine content type and S3 key with date-based folder
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    const timestamp = job.preview?.createdAt ? job.preview.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const s3Key = job.s3Key || `previews/${timestamp}/${job.previewId}.${extension}`;

    // Convert ReadableStream to Node.js stream
    const nodeStream = response.body as unknown as NodeJS.ReadableStream;
    const bodyStream = nodeStream.pipe(new PassThrough());

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: s3Key,
      Body: bodyStream,
      ContentType: contentType,
      ACL: 'private',
      Metadata: { 
        previewId: job.previewId,
        uploadedAt: new Date().toISOString(),
        source: 'queue-processor'
      },
      ServerSideEncryption: 'AES256',
      CacheControl: 'public, max-age=31536000, immutable'
    });

    const result = await s3.send(putCommand);
    clearTimeout(timeoutId);

    if (!result.ETag) {
      throw new Error('S3 upload completed but no ETag received');
    }

    return { 
      s3Key, 
      etag: result.ETag.replace(/"/g, ''), // Remove quotes from ETag
      contentType 
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Check if it's a Replicate URL expiration
    if (error instanceof Error && (
      error.message.includes('403') || 
      error.message.includes('404') ||
      error.message.includes('Forbidden') ||
      error.message.includes('Not Found')
    )) {
      throw new Error(`Replicate URL expired or inaccessible: ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * Process a single upload job
 */
async function processJob(job: QueueJob): Promise<void> {
  console.log(`[S3Queue] Processing job ${job.id} for preview ${job.previewId} (attempt ${job.attempts + 1})`);
  
  try {
    const { s3Key, etag, contentType } = await streamToS3(job);
    const s3ImageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    
    // Upload metadata file for gallery
    let metadataKey: string | null = null;
    try {
      metadataKey = await uploadMetadataToS3(job);
      console.log(`[S3Queue] Metadata uploaded for preview ${job.previewId}: ${metadataKey}`);
    } catch (metadataError) {
      console.warn(`[S3Queue] Failed to upload metadata for ${job.previewId}:`, metadataError);
      // Continue with image upload even if metadata fails
    }
    
    // Update both tables atomically
    await prisma.$transaction([
      // Update Preview with S3 URL
      prisma.preview.update({
        where: { id: job.previewId },
        data: {
          s3ImageUrl,
          s3UploadStatus: 'completed'
        }
      }),
      // Mark queue job as completed
      prisma.s3UploadQueue.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          processedAt: new Date(),
          s3Key,
          s3ETag: etag,
          contentType,
          lastError: null
        }
      })
    ]);
    
    console.log(`[S3Queue] Successfully processed job ${job.id}: ${s3Key} (${etag})`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const newAttempts = job.attempts + 1;
    
    console.error(`[S3Queue] Job ${job.id} failed (attempt ${newAttempts}):`, errorMessage);
    
    if (newAttempts >= MAX_ATTEMPTS) {
      // Mark as dead - too many failures
      await prisma.$transaction([
        prisma.preview.update({
          where: { id: job.previewId },
          data: { s3UploadStatus: 'failed' }
        }),
        prisma.s3UploadQueue.update({
          where: { id: job.id },
          data: {
            status: 'dead',
            attempts: newAttempts,
            lastError: errorMessage,
            processedAt: new Date()
          }
        })
      ]);
      console.error(`[S3Queue] Job ${job.id} marked as dead after ${newAttempts} attempts`);
    } else {
      // Schedule retry with exponential backoff
      const delayMs = nextDelayMs(newAttempts - 1);
      const nextRunAt = new Date(Date.now() + delayMs);
      
      await prisma.s3UploadQueue.update({
        where: { id: job.id },
        data: {
          status: 'pending',
          attempts: newAttempts,
          nextRunAt,
          lastError: errorMessage
        }
      });
      
      console.log(`[S3Queue] Job ${job.id} rescheduled for ${nextRunAt.toISOString()} (delay: ${delayMs}ms)`);
    }
  }
}

/**
 * Get pending jobs using PostgreSQL's SKIP LOCKED for safe concurrent processing
 */
async function getPendingJobs(limit: number): Promise<QueueJob[]> {
  const jobs = await prisma.$queryRaw<QueueJob[]>`
    WITH jobs AS (
      SELECT q.id, q."previewId", q."imageUrl", q.attempts, q."contentType", q."s3Key"
      FROM "S3UploadQueue" q
      WHERE q.status = 'pending'
        AND q."nextRunAt" <= now()
      ORDER BY q."createdAt"
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE "S3UploadQueue" q
    SET status = 'running'
    FROM jobs
    WHERE q.id = jobs.id
    RETURNING q.id, q."previewId", q."imageUrl", q.attempts, q."contentType", q."s3Key";
  `;
  
  // Fetch preview data for each job
  const jobsWithPreview = await Promise.all(
    jobs.map(async (job) => {
      try {
        const preview = await prisma.preview.findUnique({
          where: { id: job.previewId },
          select: { story: true, style: true, prompt: true, createdAt: true }
        });
        
        return { ...job, preview };
      } catch (error) {
        console.warn(`Failed to fetch preview data for ${job.previewId}:`, error);
        return job;
      }
    })
  );
  
  return jobsWithPreview;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log(`[S3Queue] Starting batch processing (limit: ${BATCH_SIZE})`);
    
    // Get pending jobs with database locking
    const jobs = await getPendingJobs(BATCH_SIZE);
    
    if (jobs.length === 0) {
      console.log(`[S3Queue] No pending jobs found`);
      return NextResponse.json({ 
        success: true, 
        processed: 0, 
        duration: Date.now() - startTime 
      });
    }
    
    console.log(`[S3Queue] Found ${jobs.length} pending jobs`);
    
    // Process jobs concurrently (but limited by BATCH_SIZE)
    const results = await Promise.allSettled(
      jobs.map(job => processJob(job))
    );
    
    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`[S3Queue] Batch completed: ${successful} successful, ${failed} failed, ${Date.now() - startTime}ms`);
    
    return NextResponse.json({
      success: true,
      processed: jobs.length,
      successful,
      failed,
      duration: Date.now() - startTime
    });
    
  } catch (error) {
    console.error(`[S3Queue] Batch processing error:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}

// Also support GET for manual triggers/health checks
export async function GET(request: NextRequest) {
  try {
    // Get queue statistics
    const stats = await prisma.s3UploadQueue.groupBy({
      by: ['status'],
      _count: { _all: true }
    });
    
    const queueStats = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count._all;
      return acc;
    }, {} as Record<string, number>);
    
    return NextResponse.json({
      success: true,
      stats: queueStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[S3Queue] Health check error:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}