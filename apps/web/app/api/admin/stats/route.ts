import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

async function handleStatsGet(request: NextRequest) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalOrdersResult, 
      todayRevenueResult, 
      pendingOrdersResult, 
      failedOrdersResult,
      awaitingApprovalResult
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { price: true },
        where: {
          createdAt: { gte: startOfToday },
          paymentStatus: 'paid'
        }
      }),
      prisma.order.count({
        where: { 
          status: { 
            in: ['PENDING', 'PAID', 'GENERATING', 'PRINT_READY'] 
          } 
        }
      }),
      prisma.order.count({
        where: { status: 'FAILED' }
      }),
      prisma.order.count({
        where: { status: 'AWAITING_APPROVAL' }
      })
    ]);

    const stats = {
      totalOrders: totalOrdersResult,
      todayRevenue: (todayRevenueResult._sum.price || 0) / 100, // Convert pence to pounds
      pendingOrders: pendingOrdersResult,
      failedOrders: failedOrdersResult,
      awaitingApproval: awaitingApprovalResult
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handleStatsGet);