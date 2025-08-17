"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PreviewAnalytics {
  totalPreviews: number;
  styleBreakdown: Record<string, number>;
  modelBreakdown: Record<string, number>;
  dailyGeneration: Array<{ date: string; count: number }>;
  averageGenerationTime: number;
  costBreakdown: {
    totalCost: number;
    byModel: Record<string, { count: number; cost: number }>;
  };
  recent: Array<{
    previewId: string;
    style: string;
    model: string;
    generationTime: number;
    cost: number;
    createdAt: string;
  }>;
}

export default function PreviewAnalyticsPage() {
  const [analytics, setAnalytics] = useState<PreviewAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, selectedStyle, selectedModel]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        days: timeRange.toString(),
        ...(selectedStyle && { style: selectedStyle }),
        ...(selectedModel && { model: selectedModel }),
      });

      const response = await fetch(`/api/admin/analytics/previews?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  const topStyles = Object.entries(analytics.styleBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const topModels = Object.entries(analytics.modelBreakdown)
    .sort(([,a], [,b]) => b - a);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preview Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Detailed insights into AI image generation performance and costs
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/analytics"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Analytics
          </Link>
          <Link
            href="/admin/analytics/gallery"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            View Gallery
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Style
            </label>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Styles</option>
              {Object.keys(analytics.styleBreakdown).map(style => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Models</option>
              {Object.keys(analytics.modelBreakdown).map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Previews</h3>
          <p className="text-3xl font-bold text-gray-900">{analytics.totalPreviews.toLocaleString()}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Avg Generation Time</h3>
          <p className="text-3xl font-bold text-gray-900">{analytics.averageGenerationTime.toFixed(1)}s</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Cost</h3>
          <p className="text-3xl font-bold text-gray-900">${analytics.costBreakdown.totalCost.toFixed(2)}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Avg Cost/Preview</h3>
          <p className="text-3xl font-bold text-gray-900">
            ${analytics.totalPreviews > 0 ? (analytics.costBreakdown.totalCost / analytics.totalPreviews).toFixed(3) : '0.000'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Style Breakdown */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Styles</h3>
          <div className="space-y-3">
            {topStyles.map(([style, count]) => (
              <div key={style} className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 capitalize">{style}</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(count / analytics.totalPreviews) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Usage */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Model Usage & Costs</h3>
          <div className="space-y-3">
            {topModels.map(([model, count]) => {
              const modelCost = analytics.costBreakdown.byModel[model]?.cost || 0;
              return (
                <div key={model} className="border-b border-gray-100 pb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{model}</span>
                    <span className="text-sm text-gray-500">{count} generations</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Cost: ${modelCost.toFixed(2)}</span>
                    <span>Avg: ${(modelCost / count).toFixed(3)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Generation Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Generation Volume</h3>
        <div className="h-64 flex items-end space-x-1">
          {analytics.dailyGeneration.map((day, index) => {
            const maxCount = Math.max(...analytics.dailyGeneration.map(d => d.count));
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${height}%` }}
                ></div>
                <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
                  {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-xs text-gray-700 font-medium">{day.count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Previews */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Previews</h3>
          <Link
            href="/admin/analytics/gallery"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            View All →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Style</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.recent.slice(0, 10).map((preview) => (
                <tr key={preview.previewId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {preview.previewId.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {preview.style}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {preview.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {preview.generationTime.toFixed(1)}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${preview.cost.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(preview.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}