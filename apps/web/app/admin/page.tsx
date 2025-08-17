import { Suspense } from 'react';
import Link from 'next/link';
import OrderList from './orders/order-list';
import SystemHealth from './system-health';
import DashboardStats from './dashboard-stats';
import QuickActions from './quick-actions';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor orders, system health, and site operations
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/approvals"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            ✅ Approvals
          </Link>
          <Link
            href="/admin/analytics"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            📈 Analytics
          </Link>
        </div>
      </div>

      {/* Dashboard Statistics */}
      <Suspense fallback={<div className="animate-pulse h-32 bg-gray-200 rounded-lg"></div>}>
        <DashboardStats />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders - Now with scrolling */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Recent Orders
                </h3>
                <Link
                  href="/admin/orders"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View All →
                </Link>
              </div>
              {/* Fixed height container with scrolling */}
              <div className="max-h-96 overflow-y-auto">
                <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded"></div>}>
                  <OrderList limit={10} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <QuickActions />

          {/* System Health */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                System Health
              </h3>
              <Suspense fallback={<div className="animate-pulse h-24 bg-gray-100 rounded"></div>}>
                <SystemHealth />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}