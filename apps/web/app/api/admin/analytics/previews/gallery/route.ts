import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { S3Storage } from '@taletoprint/ai-pipeline/src/shared/storage';

interface PreviewGalleryItem {
  previewId: string;
  imageUrl: string;
  metadata: {
    style: string;
    model: string;
    generationTime: number;
    cost: number;
    prompt: string;
    createdAt: string;
    aspectRatio: string;
  };
}

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const style = searchParams.get('style') || undefined;
  const model = searchParams.get('model') || undefined;
  const search = searchParams.get('search') || undefined;

  try {
    const s3Storage = new S3Storage(
      process.env.AWS_REGION || 'eu-north-1',
      process.env.AWS_S3_BUCKET || 'taletoprint-assets',
      process.env.AWS_ACCESS_KEY_ID,
      process.env.AWS_SECRET_ACCESS_KEY
    );

    const gallery = await getPreviewGallery(s3Storage, {
      page,
      limit,
      style,
      model,
      search,
    });

    return NextResponse.json({
      success: true,
      gallery,
      pagination: {
        page,
        limit,
        total: gallery.total,
        pages: Math.ceil(gallery.total / limit),
      },
      filters: { style, model, search },
    });

  } catch (error) {
    console.error('Error fetching preview gallery:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery' },
      { status: 500 }
    );
  }
}

async function getPreviewGallery(
  s3Storage: S3Storage,
  filters: {
    page: number;
    limit: number;
    style?: string;
    model?: string;
    search?: string;
  }
): Promise<{ items: PreviewGalleryItem[]; total: number }> {
  const allItems: PreviewGalleryItem[] = [];

  // Get all preview metadata files from S3
  const metadataFiles = await s3Storage.listObjects('previews/', '_metadata.json');
  
  for (const file of metadataFiles) {
    try {
      // Extract preview info from file path
      const pathParts = file.key.split('/');
      if (pathParts.length < 3) continue;
      
      const dateFolder = pathParts[1]; // e.g., "2024-01-15"
      const filename = pathParts[2]; // e.g., "preview_id_metadata.json"
      const previewId = filename.replace('_metadata.json', '');

      // Fetch and parse metadata
      const signedUrl = await s3Storage.getSignedUrl(file.key, 300);
      const response = await fetch(signedUrl);
      if (!response.ok) continue;

      const metadata = await response.json();
      
      // Apply filters
      if (filters.style && metadata.requestedStyle !== filters.style) continue;
      if (filters.model && metadata.modelUsed !== filters.model) continue;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableText = [
          metadata.refinedPrompt || '',
          metadata.requestedStyle || '',
          metadata.modelUsed || '',
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchLower)) continue;
      }

      // Get image URL
      const imageKey = `previews/${dateFolder}/${previewId}.jpg`;
      const imageUrl = await s3Storage.getSignedUrl(imageKey, 3600); // 1 hour

      const item: PreviewGalleryItem = {
        previewId,
        imageUrl,
        metadata: {
          style: metadata.requestedStyle || 'unknown',
          model: metadata.modelUsed || 'unknown',
          generationTime: metadata.generationTime || 0,
          cost: calculateGenerationCost(metadata),
          prompt: metadata.refinedPrompt || 'No prompt available',
          createdAt: metadata.createdAt || new Date().toISOString(),
          aspectRatio: metadata.aspectRatio || 'unknown',
        },
      };

      allItems.push(item);

    } catch (error) {
      console.warn(`Failed to process preview ${file.key}:`, error);
    }
  }

  // Sort by creation date (newest first)
  allItems.sort((a, b) => 
    new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
  );

  // Apply pagination
  const start = (filters.page - 1) * filters.limit;
  const end = start + filters.limit;
  const paginatedItems = allItems.slice(start, end);

  return {
    items: paginatedItems,
    total: allItems.length,
  };
}

function calculateGenerationCost(metadata: any): number {
  const model = metadata.modelUsed || 'unknown';
  
  const costs = {
    'flux-schnell': 0.003,
    'flux-dev': 0.055,
    'sdxl': 0.0035,
  };

  return costs[model as keyof typeof costs] || 0;
}