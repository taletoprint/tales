import { Suspense } from 'react';
import OrderList from './order-list';
import OrderFilters from './order-filters';

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          View and manage all customer orders
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <Suspense fallback={<div>Loading filters...</div>}>
            <OrderFilters />
          </Suspense>
          
          <div className="mt-6">
            <Suspense fallback={<div>Loading orders...</div>}>
              <OrderList />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}