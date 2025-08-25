import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

interface PreviewStats {
  totalPreviews: number;
  todayPreviews: number;
  weekPreviews: number;
  monthPreviews: number;
  styleBreakdown: Record<string, number>;
  s3UploadStatus: {
    pending: number;
    completed: number;
    failed: number;
  };
  conversionRate: {
    total: number;
    withOrders: number;
    percentage: number;
  };
  dailyGeneration: Array<{
    date: string;
    count: number;
    orders: number;
  }>;
  userStats: {
    totalUsers: number;
    averagePreviewsPerUser: number;
  };
  ipStats: {
    uniqueIPs: number;
    averagePreviewsPerIP: number;
  };
}

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

    // Get total counts
    const [
      totalPreviews,
      todayPreviews,
      weekPreviews,
      monthPreviews,
      previewsWithOrders,
    ] = await Promise.all([
      prisma.preview.count(),
      prisma.preview.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.preview.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      prisma.preview.count({
        where: { createdAt: { gte: monthAgo } },
      }),
      prisma.preview.count({
        where: { order: { isNot: null } },
      }),
    ]);

    // Get style breakdown
    const styleBreakdown = await prisma.preview.groupBy({
      by: ['style'],
      _count: { _all: true },
      orderBy: { _count: { style: 'desc' } },
    });

    // Get S3 upload status
    const s3StatusBreakdown = await prisma.preview.groupBy({
      by: ['s3UploadStatus'],
      _count: { _all: true },
    });

    // Get daily generation stats for the specified period
    const dailyStats = await prisma.$queryRaw<Array<{
      date: Date;
      count: bigint;
      orders: bigint;
    }>>`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*)::bigint as count,
        COUNT(CASE WHEN "order"."id" IS NOT NULL THEN 1 END)::bigint as orders
      FROM "Preview"
      LEFT JOIN "Order" AS "order" ON "Preview"."id" = "order"."previewId"
      WHERE "Preview"."createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `;

    // Get unique users and IPs
    const [uniqueUsers, uniqueIPs] = await Promise.all([
      prisma.preview.findMany({
        where: { userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.preview.findMany({
        select: { ipAddress: true },
        distinct: ['ipAddress'],
      }),
    ]);

    const stats: PreviewStats = {
      totalPreviews,
      todayPreviews,
      weekPreviews,
      monthPreviews,
      styleBreakdown: styleBreakdown.reduce((acc, item) => {
        acc[item.style] = item._count._all;
        return acc;
      }, {} as Record<string, number>),
      s3UploadStatus: {
        pending: 0,
        completed: 0,
        failed: 0,
      },
      conversionRate: {
        total: totalPreviews,
        withOrders: previewsWithOrders,
        percentage: totalPreviews > 0 ? (previewsWithOrders / totalPreviews) * 100 : 0,
      },
      dailyGeneration: dailyStats.map(stat => ({
        date: stat.date.toISOString().split('T')[0],
        count: Number(stat.count),
        orders: Number(stat.orders),
      })),
      userStats: {
        totalUsers: uniqueUsers.length,
        averagePreviewsPerUser: uniqueUsers.length > 0 
          ? totalPreviews / uniqueUsers.length 
          : 0,
      },
      ipStats: {
        uniqueIPs: uniqueIPs.length,
        averagePreviewsPerIP: uniqueIPs.length > 0 
          ? totalPreviews / uniqueIPs.length 
          : 0,
      },
    };

    // Process S3 upload status
    s3StatusBreakdown.forEach(status => {
      if (status.s3UploadStatus === 'pending') {
        stats.s3UploadStatus.pending = status._count._all;
      } else if (status.s3UploadStatus === 'completed') {
        stats.s3UploadStatus.completed = status._count._all;
      } else if (status.s3UploadStatus === 'failed') {
        stats.s3UploadStatus.failed = status._count._all;
      }
    });

    return NextResponse.json({
      success: true,
      stats,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
    });

  } catch (error) {
    console.error('Error fetching preview statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preview statistics' },
      { status: 500 }
    );
  }
}