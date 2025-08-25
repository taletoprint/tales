'use client';

import { useState, useEffect } from 'react';

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

export default function PreviewStatsPage() {
  const [stats, setStats] = useState<PreviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchStats();
  }, [days]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/previews/db/stats?days=${days}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">Loading statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12 text-red-600">Failed to load statistics</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Preview Statistics</h1>
          <p className="text-gray-600">Real-time analytics from the database</p>
        </div>
        <div>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Previews</h3>
          <p className="text-3xl font-bold">{stats.totalPreviews.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-2">All time</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Today</h3>
          <p className="text-3xl font-bold">{stats.todayPreviews}</p>
          <p className="text-sm text-gray-500 mt-2">
            Week: {stats.weekPreviews} | Month: {stats.monthPreviews}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Conversion Rate</h3>
          <p className="text-3xl font-bold">{stats.conversionRate.percentage.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-2">
            {stats.conversionRate.withOrders} of {stats.conversionRate.total}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Unique Users</h3>
          <p className="text-3xl font-bold">{stats.userStats.totalUsers}</p>
          <p className="text-sm text-gray-500 mt-2">
            {stats.userStats.averagePreviewsPerUser.toFixed(1)} previews/user
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Style Breakdown */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Style Popularity</h3>
          <div className="space-y-3">
            {Object.entries(stats.styleBreakdown)
              .sort(([,a], [,b]) => b - a)
              .map(([style, count]) => {
                const percentage = (count / stats.totalPreviews) * 100;
                return (
                  <div key={style}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{style.replace('_', ' ')}</span>
                      <span>{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* S3 Upload Status */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">S3 Upload Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-green-600 font-medium">Completed</span>
              <span className="text-2xl font-bold">{stats.s3UploadStatus.completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-yellow-600 font-medium">Pending</span>
              <span className="text-2xl font-bold">{stats.s3UploadStatus.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-600 font-medium">Failed</span>
              <span className="text-2xl font-bold">{stats.s3UploadStatus.failed}</span>
            </div>
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-500">
                Success Rate: {stats.s3UploadStatus.completed > 0 
                  ? ((stats.s3UploadStatus.completed / (stats.s3UploadStatus.completed + stats.s3UploadStatus.failed)) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Generation Chart */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Daily Generation & Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-sm text-gray-500">
                <th className="text-left pb-2">Date</th>
                <th className="text-right pb-2">Previews</th>
                <th className="text-right pb-2">Orders</th>
                <th className="text-right pb-2">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {stats.dailyGeneration.slice(0, 10).map((day) => {
                const conversion = day.count > 0 ? (day.orders / day.count) * 100 : 0;
                return (
                  <tr key={day.date} className="border-t">
                    <td className="py-2 text-sm">{day.date}</td>
                    <td className="py-2 text-sm text-right">{day.count}</td>
                    <td className="py-2 text-sm text-right">{day.orders}</td>
                    <td className="py-2 text-sm text-right">{conversion.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* IP Stats */}
      <div className="bg-white p-6 rounded-lg border mt-6">
        <h3 className="text-lg font-semibold mb-4">IP Address Statistics</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Unique IP Addresses</p>
            <p className="text-2xl font-bold">{stats.ipStats.uniqueIPs}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Average Previews per IP</p>
            <p className="text-2xl font-bold">{stats.ipStats.averagePreviewsPerIP.toFixed(1)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}