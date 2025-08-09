import { Suspense } from 'react';
import RevenueChart from './revenue-chart';
import OrderStats from './order-stats';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Revenue insights and order statistics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Revenue Over Time
              </h3>
              <Suspense fallback={<div>Loading chart...</div>}>
                <RevenueChart />
              </Suspense>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Order Statistics
              </h3>
              <Suspense fallback={<div>Loading stats...</div>}>
                <OrderStats />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}