import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { S3Storage } from '@taletoprint/ai-pipeline/src/shared/storage';

interface PreviewAnalytics {
  totalPreviews: number;
  styleBreakdown: Record<string, number>;
  modelBreakdown: Record<string, number>;
  dailyGeneration: Array<{ date: string; count: number }>;
  averageGenerationTime: number;
  costBreakdown: {
    totalCost: number;
    byModel: Record<string, { count: number; cost: number }>;
  };
  recent: Array<{
    previewId: string;
    style: string;
    model: string;
    generationTime: number;
    cost: number;
    createdAt: string;
  }>;
}

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');
  const style = searchParams.get('style') || undefined;
  const model = searchParams.get('model') || undefined;

  try {
    const s3Storage = new S3Storage(
      process.env.AWS_REGION || 'eu-north-1',
      process.env.AWS_S3_BUCKET || 'taletoprint-assets',
      process.env.AWS_ACCESS_KEY_ID,
      process.env.AWS_SECRET_ACCESS_KEY
    );

    const analytics = await collectPreviewAnalytics(s3Storage, {
      days,
      style,
      model,
    });

    return NextResponse.json({
      success: true,
      analytics,
      filters: { days, style, model },
    });

  } catch (error) {
    console.error('Error fetching preview analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

async function collectPreviewAnalytics(
  s3Storage: S3Storage,
  filters: { days: number; style?: string; model?: string }
): Promise<PreviewAnalytics> {
  const analytics: PreviewAnalytics = {
    totalPreviews: 0,
    styleBreakdown: {},
    modelBreakdown: {},
    dailyGeneration: [],
    averageGenerationTime: 0,
    costBreakdown: {
      totalCost: 0,
      byModel: {},
    },
    recent: [],
  };

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - filters.days);

  // Get all preview metadata files from S3
  const metadataFiles = await s3Storage.listObjects('previews/', '_metadata.json');
  
  let totalGenerationTime = 0;
  const dailyCounts: Record<string, number> = {};
  const recentPreviews: typeof analytics.recent = [];

  for (const file of metadataFiles) {
    try {
      // Extract date from file path: previews/2024-01-15/preview_id_metadata.json
      const pathParts = file.key.split('/');
      if (pathParts.length < 3) continue;
      
      const fileDate = new Date(pathParts[1]);
      if (fileDate < startDate || fileDate > endDate) continue;

      // Fetch and parse metadata
      const signedUrl = await s3Storage.getSignedUrl(file.key, 300);
      const response = await fetch(signedUrl);
      if (!response.ok) continue;

      const metadata = await response.json();
      
      // Apply filters
      if (filters.style && metadata.requestedStyle !== filters.style) continue;
      if (filters.model && metadata.model !== filters.model) continue;

      // Count this preview
      analytics.totalPreviews++;

      // Style breakdown
      const style = metadata.requestedStyle || 'unknown';
      analytics.styleBreakdown[style] = (analytics.styleBreakdown[style] || 0) + 1;

      // Model breakdown
      const model = metadata.model || 'unknown';
      analytics.modelBreakdown[model] = (analytics.modelBreakdown[model] || 0) + 1;

      // Daily generation count
      const dateKey = fileDate.toISOString().split('T')[0];
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;

      // Generation time
      if (metadata.generationTimeMs) {
        totalGenerationTime += metadata.generationTimeMs / 1000; // Convert to seconds
      }

      // Cost tracking
      const cost = calculateGenerationCost(metadata);
      analytics.costBreakdown.totalCost += cost;
      
      if (!analytics.costBreakdown.byModel[model]) {
        analytics.costBreakdown.byModel[model] = { count: 0, cost: 0 };
      }
      analytics.costBreakdown.byModel[model].count++;
      analytics.costBreakdown.byModel[model].cost += cost;

      // Add to recent list
      recentPreviews.push({
        previewId: metadata.previewId || pathParts[2].replace('_metadata.json', ''),
        style,
        model,
        generationTime: metadata.generationTimeMs ? metadata.generationTimeMs / 1000 : 0,
        cost,
        createdAt: metadata.generatedAt || fileDate.toISOString(),
      });

    } catch (error) {
      console.warn(`Failed to process metadata file ${file.key}:`, error);
    }
  }

  // Calculate averages
  analytics.averageGenerationTime = analytics.totalPreviews > 0 
    ? totalGenerationTime / analytics.totalPreviews 
    : 0;

  // Build daily generation array
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    analytics.dailyGeneration.push({
      date: dateKey,
      count: dailyCounts[dateKey] || 0,
    });
  }

  // Sort recent previews by creation date (newest first) and limit to 50
  analytics.recent = recentPreviews
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  return analytics;
}

function calculateGenerationCost(metadata: any): number {
  // Cost calculation based on model and parameters
  const model = metadata.model || 'unknown';
  
  const costs = {
    'flux-schnell': 0.003,
    'flux-dev': 0.055,
    'sdxl': 0.0035,
  };

  return costs[model as keyof typeof costs] || 0;
}