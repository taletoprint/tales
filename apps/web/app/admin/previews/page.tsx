'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Preview {
  id: string;
  createdAt: string;
  story: string;
  style: string;
  prompt: string;
  imageUrl: string;
  s3ImageUrl: string | null;
  s3UploadStatus: string;
  ipAddress: string;
  user: { email: string } | null;
  order: {
    id: string;
    status: string;
    price: number;
    email: string;
  } | null;
  s3UploadQueue: {
    status: string;
    attempts: number;
    lastError: string | null;
  } | null;
}

interface PreviewStats {
  total: number;
  s3Upload: {
    pending: number;
    completed: number;
    failed: number;
  };
  styles: Record<string, number>;
}

export default function DatabasePreviewsPage() {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [stats, setStats] = useState<PreviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    style: '',
    s3Status: '',
    hasOrder: '',
    search: '',
  });

  useEffect(() => {
    fetchPreviews();
  }, [page, filters]);

  const fetchPreviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.style && { style: filters.style }),
        ...(filters.s3Status && { s3Status: filters.s3Status }),
        ...(filters.hasOrder && { hasOrder: filters.hasOrder }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/admin/previews/db?${params}`);
      const data = await response.json();

      if (data.success) {
        setPreviews(data.previews);
        setStats(data.stats);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch previews:', error);
    } finally {
      setLoading(false);
    }
  };

  const processHistorical = async (dryRun = true) => {
    try {
      const response = await fetch('/api/admin/queue/process-historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50, dryRun }),
      });
      
      const result = await response.json();
      alert(result.message || 'Processing complete');
      
      if (!dryRun) {
        fetchPreviews(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to process historical previews:', error);
      alert('Processing failed');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Database Previews</h1>
        <p className="text-gray-600">View all previews stored in the database with real-time data</p>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Total Previews</h3>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">S3 Upload Status</h3>
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-sm">
                <span>Completed:</span>
                <span className="font-medium text-green-600">{stats.s3Upload.completed || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pending:</span>
                <span className="font-medium text-yellow-600">{stats.s3Upload.pending || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Failed:</span>
                <span className="font-medium text-red-600">{stats.s3Upload.failed || 0}</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Top Styles</h3>
            <div className="space-y-1 mt-2">
              {Object.entries(stats.styles).slice(0, 3).map(([style, count]) => (
                <div key={style} className="flex justify-between text-sm">
                  <span>{style}:</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Historical Processing</h3>
            <div className="space-y-2 mt-2">
              <button
                onClick={() => processHistorical(true)}
                className="w-full text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Dry Run (50)
              </button>
              <button
                onClick={() => processHistorical(false)}
                className="w-full text-sm px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded"
              >
                Process Historical
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search story or ID..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <select
            value={filters.style}
            onChange={(e) => setFilters({ ...filters, style: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Styles</option>
            <option value="watercolour">Watercolour</option>
            <option value="oil_painting">Oil Painting</option>
            <option value="pastel">Pastel</option>
            <option value="pencil_ink">Pencil & Ink</option>
            <option value="storybook">Storybook</option>
            <option value="impressionist">Impressionist</option>
          </select>
          <select
            value={filters.s3Status}
            onChange={(e) => setFilters({ ...filters, s3Status: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All S3 Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={filters.hasOrder}
            onChange={(e) => setFilters({ ...filters, hasOrder: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Previews</option>
            <option value="true">With Orders</option>
            <option value="false">Without Orders</option>
          </select>
          <button
            onClick={() => setFilters({ style: '', s3Status: '', hasOrder: '', search: '' })}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Previews Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preview
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Story & Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  S3 Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : previews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No previews found
                  </td>
                </tr>
              ) : (
                previews.map((preview) => (
                  <tr key={preview.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="w-20 h-20 relative">
                        <img
                          src={preview.s3ImageUrl || preview.imageUrl}
                          alt={preview.style}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {preview.id}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {preview.story}
                        </p>
                        <p className="text-xs text-gray-400">
                          Style: {preview.style} | IP: {preview.ipAddress}
                        </p>
                        {preview.user && (
                          <p className="text-xs text-blue-600">
                            User: {preview.user.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(preview.s3UploadStatus)}`}>
                        {preview.s3UploadStatus}
                      </span>
                      {preview.s3UploadQueue && (
                        <div className="mt-1">
                          <p className="text-xs text-gray-500">
                            Queue: {preview.s3UploadQueue.status}
                          </p>
                          {preview.s3UploadQueue.attempts > 0 && (
                            <p className="text-xs text-gray-500">
                              Attempts: {preview.s3UploadQueue.attempts}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {preview.order ? (
                        <div>
                          <p className="text-sm font-medium text-green-600">
                            Order #{preview.order.id.slice(-8)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {preview.order.status}
                          </p>
                          <p className="text-xs text-gray-500">
                            £{(preview.order.price / 100).toFixed(2)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No order</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">
                        {new Date(preview.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(preview.createdAt).toLocaleTimeString()}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{page}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}