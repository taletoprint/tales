import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { PrismaClient } from '@taletoprint/database';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get weekly date range
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Fetch all required data in parallel
    const [
      todayOrders,
      weeklyOrders,
      pendingApprovals,
      allOrdersByStatus,
      recentOrders,
    ] = await Promise.all([
      // Today's orders count
      prisma.order.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),

      // Weekly revenue
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: weekAgo,
          },
          status: {
            in: ['PAID', 'GENERATING', 'PRINT_READY', 'PRINTING', 'SHIPPED', 'DELIVERED'],
          },
        },
        select: {
          price: true,
        },
      }),

      // Pending approvals count
      prisma.order.count({
        where: {
          status: 'PRINT_READY',
        },
      }),

      // Orders by status
      prisma.order.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),

      // Recent orders for activity feed
      prisma.order.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          email: true,
          status: true,
          createdAt: true,
          printSize: true,
          metadata: true,
        },
      }),
    ]);

    // Calculate weekly revenue
    const weeklyRevenue = weeklyOrders.reduce((sum, order) => sum + order.price, 0);

    // Transform orders by status into object
    const ordersByStatus: Record<string, number> = {};
    allOrdersByStatus.forEach((group) => {
      ordersByStatus[group.status] = group._count.status;
    });

    // Calculate active jobs (orders being processed)
    const activeJobs = (ordersByStatus.GENERATING || 0) + 
                      (ordersByStatus.PRINTING || 0) + 
                      (ordersByStatus.PRINT_READY || 0);

    // Transform recent orders into activity feed
    const recentActivity = recentOrders.map((order) => ({
      id: order.id,
      type: 'order' as const,
      message: `New ${order.printSize || 'A3'} order from ${order.email}`,
      timestamp: order.createdAt.toISOString(),
    }));

    const stats = {
      todayOrders,
      weeklyRevenue,
      pendingApprovals,
      activeJobs,
      ordersByStatus,
      recentActivity,
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}