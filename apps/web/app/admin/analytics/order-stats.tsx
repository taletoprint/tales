'use client';

import { useState, useEffect } from 'react';

interface Analytics {
  revenue: {
    total: number;
    average: number;
  };
  orders: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
    bySize: Array<{ size: string; count: number }>;
  };
}

export default function OrderStats() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return `£${(price / 100).toFixed(2)}`;
  };

  if (loading) {
    return <div className="animate-pulse">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="text-red-600">Failed to load analytics</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <dt className="text-sm font-medium text-blue-600">Total Revenue</dt>
          <dd className="text-2xl font-bold text-blue-900">
            {formatPrice(analytics.revenue.total)}
          </dd>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <dt className="text-sm font-medium text-green-600">Total Orders</dt>
          <dd className="text-2xl font-bold text-green-900">
            {analytics.orders.total}
          </dd>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <dt className="text-sm font-medium text-purple-600">Avg Order Value</dt>
          <dd className="text-2xl font-bold text-purple-900">
            {formatPrice(analytics.revenue.average)}
          </dd>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Order Status</h4>
        <div className="space-y-2">
          {analytics.orders.byStatus.map((item) => (
            <div key={item.status} className="flex justify-between text-sm">
              <span className="text-gray-600">{item.status}:</span>
              <span className="font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Print Sizes</h4>
        <div className="space-y-2">
          {analytics.orders.bySize.map((item) => (
            <div key={item.size} className="flex justify-between text-sm">
              <span className="text-gray-600">{item.size}:</span>
              <span className="font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}