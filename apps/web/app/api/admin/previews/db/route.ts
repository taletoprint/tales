import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const style = searchParams.get('style') || undefined;
  const hasOrder = searchParams.get('hasOrder');
  const s3Status = searchParams.get('s3Status') || undefined;
  const search = searchParams.get('search') || undefined;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: any = {};
    
    if (style) {
      where.style = style;
    }
    
    if (hasOrder === 'true') {
      where.order = { isNot: null };
    } else if (hasOrder === 'false') {
      where.order = { is: null };
    }
    
    if (s3Status) {
      where.s3UploadStatus = s3Status;
    }
    
    if (search) {
      where.OR = [
        { story: { contains: search, mode: 'insensitive' } },
        { prompt: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch previews with related data
    const [previews, total] = await Promise.all([
      prisma.preview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              price: true,
              email: true,
              createdAt: true,
            },
          },
          s3UploadQueue: {
            select: {
              status: true,
              attempts: true,
              lastError: true,
              processedAt: true,
            },
          },
          user: {
            select: {
              email: true,
            },
          },
        },
      }),
      prisma.preview.count({ where }),
    ]);

    // Get statistics
    const stats = await prisma.preview.aggregate({
      where,
      _count: {
        _all: true,
      },
    });

    const s3Stats = await prisma.preview.groupBy({
      by: ['s3UploadStatus'],
      where,
      _count: {
        _all: true,
      },
    });

    const styleStats = await prisma.preview.groupBy({
      by: ['style'],
      where,
      _count: {
        _all: true,
      },
    });

    return NextResponse.json({
      success: true,
      previews: previews.map(preview => ({
        id: preview.id,
        createdAt: preview.createdAt.toISOString(),
        expiresAt: preview.expiresAt.toISOString(),
        story: preview.story,
        style: preview.style,
        prompt: preview.prompt,
        imageUrl: preview.imageUrl,
        s3ImageUrl: preview.s3ImageUrl,
        s3UploadStatus: preview.s3UploadStatus,
        s3UploadQueue: preview.s3UploadQueue,
        ipAddress: preview.ipAddress,
        user: preview.user,
        order: preview.order,
        selected: preview.selected,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        total: stats._count._all,
        s3Upload: s3Stats.reduce((acc, stat) => {
          acc[stat.s3UploadStatus] = stat._count._all;
          return acc;
        }, {} as Record<string, number>),
        styles: styleStats.reduce((acc, stat) => {
          acc[stat.style] = stat._count._all;
          return acc;
        }, {} as Record<string, number>),
      },
      filters: {
        style,
        hasOrder,
        s3Status,
        search,
        startDate,
        endDate,
      },
    });

  } catch (error) {
    console.error('Error fetching database previews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch previews from database' },
      { status: 500 }
    );
  }
}