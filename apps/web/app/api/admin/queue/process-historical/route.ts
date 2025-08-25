import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PreviewMetadata } from '@taletoprint/ai-pipeline/src/shared/storage';

const s3 = new S3Client({ 
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

export async function POST(request: NextRequest) {
  // Check admin authentication
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { limit = 100, dryRun = false } = await request.json();
    
    console.log(`[Historical] Starting historical preview processing (limit: ${limit}, dryRun: ${dryRun})`);

    // Find previews that don't have S3 metadata files
    const previewsToProcess = await prisma.preview.findMany({
      where: {
        OR: [
          { s3ImageUrl: null },
          { s3UploadStatus: { not: 'completed' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        order: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    console.log(`[Historical] Found ${previewsToProcess.length} previews to process`);

    const results = {
      total: previewsToProcess.length,
      processed: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const preview of previewsToProcess) {
      try {
        const timestamp = preview.createdAt.toISOString().split('T')[0];
        const metadataKey = `previews/${timestamp}/${preview.id}_metadata.json`;

        // Create metadata matching the expected format
        const metadata: PreviewMetadata = {
          previewId: preview.id,
          generatedAt: preview.createdAt.toISOString(),
          originalStory: preview.story,
          requestedStyle: preview.style,
          requestedAspect: 'portrait', // Default since we don't store this
          refinedPrompt: preview.prompt,
          negativePrompt: '', // Not stored
          openaiEnhanced: true, // Assume true for historical data
          model: determineModelFromDate(preview.createdAt),
          routingReason: 'Historical data - model inferred from date',
          hasPeople: false, // We don't have this data
          loraUsed: preview.createdAt > new Date('2024-08-18'), // LoRAs introduced after this date
          modelVersion: 'historical',
          steps: 28,
          seed: Math.floor(Math.random() * 1000000),
          dimensions: { width: 1024, height: 1024 }, // Default
          generationTimeMs: 10000, // Estimate
          estimatedCost: 0.035, // Average
          phase: 'historical-recovery',
          replicateUrl: preview.imageUrl,
          s3ImageUrl: preview.s3ImageUrl || undefined,
          styleKeywords: [preview.style],
        };

        if (!dryRun) {
          // Upload metadata to S3
          const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2), 'utf8');
          
          const putCommand = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: metadataKey,
            Body: metadataBuffer,
            ContentType: 'application/json',
            ACL: 'private',
            Metadata: {
              previewId: preview.id,
              type: 'metadata',
              source: 'historical-recovery',
              processedAt: new Date().toISOString(),
            },
            ServerSideEncryption: 'AES256',
          });

          await s3.send(putCommand);

          // Queue for image upload if not already uploaded
          if (!preview.s3ImageUrl) {
            const existingQueue = await prisma.s3UploadQueue.findUnique({
              where: { previewId: preview.id },
            });

            if (!existingQueue) {
              await prisma.s3UploadQueue.create({
                data: {
                  previewId: preview.id,
                  imageUrl: preview.imageUrl,
                  status: 'pending',
                  attempts: 0,
                  nextRunAt: new Date(),
                  s3Key: `previews/${timestamp}/${preview.id}.jpg`,
                },
              });
            }
          }

          results.processed++;
          results.details.push({
            previewId: preview.id,
            metadataKey,
            queuedForImageUpload: !preview.s3ImageUrl,
            hasOrder: !!preview.order,
          });
        } else {
          results.skipped++;
          results.details.push({
            previewId: preview.id,
            metadataKey,
            wouldQueueForImageUpload: !preview.s3ImageUrl,
            hasOrder: !!preview.order,
            dryRun: true,
          });
        }

        console.log(`[Historical] ${dryRun ? 'Would process' : 'Processed'} preview ${preview.id}`);

      } catch (error) {
        console.error(`[Historical] Failed to process preview ${preview.id}:`, error);
        results.failed++;
        results.details.push({
          previewId: preview.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`[Historical] Processing complete: ${results.processed} processed, ${results.skipped} skipped, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      results,
      message: dryRun 
        ? `Dry run complete. Would process ${results.total} previews.` 
        : `Processed ${results.processed} of ${results.total} previews.`,
    });

  } catch (error) {
    console.error('[Historical] Processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process historical previews' },
      { status: 500 }
    );
  }
}

// Helper function to infer model from date
function determineModelFromDate(date: Date): 'flux-dev-lora' | 'flux-schnell' | 'sdxl' {
  // Rough timeline based on when models were introduced
  if (date >= new Date('2024-08-18')) {
    return 'flux-dev-lora'; // LoRA models introduced
  } else if (date >= new Date('2024-07-01')) {
    return 'flux-schnell';
  }
  return 'sdxl';
}