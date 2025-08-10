import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { PrismaClient } from '@taletoprint/database';

const prisma = new PrismaClient();

async function handleAnalyticsGet(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Revenue by day
    const revenueByDay = await prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
        paymentStatus: 'paid',
      },
      _sum: { price: true },
      _count: true,
    });

    // Order status breakdown
    const statusBreakdown = await prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Print size popularity
    const sizeBreakdown = await prisma.order.groupBy({
      by: ['printSize'],
      where: {
        createdAt: { gte: startDate },
        paymentStatus: 'paid',
      },
      _count: true,
    });

    // Total metrics
    const totalOrders = await prisma.order.count({
      where: { createdAt: { gte: startDate } },
    });

    const totalRevenue = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startDate },
        paymentStatus: 'paid',
      },
      _sum: { price: true },
    });

    const averageOrderValue = totalRevenue._sum.price 
      ? totalRevenue._sum.price / (await prisma.order.count({
          where: {
            createdAt: { gte: startDate },
            paymentStatus: 'paid',
          },
        }))
      : 0;

    return NextResponse.json({
      revenue: {
        total: totalRevenue._sum.price || 0,
        average: Math.round(averageOrderValue || 0),
        byDay: revenueByDay.map((item: any) => ({
          date: item.createdAt.toISOString().split('T')[0],
          revenue: item._sum.price || 0,
          orders: item._count,
        })),
      },
      orders: {
        total: totalOrders,
        byStatus: statusBreakdown.map((item: any) => ({
          status: item.status,
          count: item._count,
        })),
        bySize: sizeBreakdown.map((item: any) => ({
          size: item.printSize || 'Unknown',
          count: item._count,
        })),
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handleAnalyticsGet);