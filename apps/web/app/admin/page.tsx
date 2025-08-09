import { Suspense } from 'react';
import OrderList from './orders/order-list';
import SystemHealth from './system-health';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor orders, system health, and site operations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Orders
              </h3>
              <Suspense fallback={<div>Loading orders...</div>}>
                <OrderList limit={10} />
              </Suspense>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                System Health
              </h3>
              <Suspense fallback={<div>Loading health...</div>}>
                <SystemHealth />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}