"use client";

import { useState, useEffect } from 'react';

interface PreviewAnalyticsSummary {
  totalPreviews: number;
  totalCost: number;
  averageGenerationTime: number;
  topStyle: string;
  topModel: string;
  modelBreakdown: Record<string, number>;
}

export default function PreviewAnalyticsSummary() {
  const [analytics, setAnalytics] = useState<PreviewAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsSummary();
  }, []);

  const fetchAnalyticsSummary = async () => {
    try {
      const response = await fetch('/api/admin/analytics/previews?days=30');
      const data = await response.json();
      
      if (data.success) {
        const { analytics: fullAnalytics } = data;
        
        // Find top style and model
        const topStyle = Object.entries(fullAnalytics.styleBreakdown)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'Unknown';
        
        const topModel = Object.entries(fullAnalytics.modelBreakdown)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'Unknown';

        setAnalytics({
          totalPreviews: fullAnalytics.totalPreviews,
          totalCost: fullAnalytics.costBreakdown.totalCost,
          averageGenerationTime: fullAnalytics.averageGenerationTime,
          topStyle,
          topModel,
          modelBreakdown: fullAnalytics.modelBreakdown,
        });
      }
    } catch (error) {
      console.error('Failed to fetch analytics summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-500">
        No preview analytics data available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">{analytics.totalPreviews.toLocaleString()}</div>
        <div className="text-sm text-gray-500">Total Previews</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">${analytics.totalCost.toFixed(2)}</div>
        <div className="text-sm text-gray-500">Total Cost</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{analytics.averageGenerationTime.toFixed(1)}s</div>
        <div className="text-sm text-gray-500">Avg Generation</div>
      </div>
      
      <div className="text-center">
        <div className="text-lg font-bold text-purple-600 capitalize">{analytics.topStyle}</div>
        <div className="text-sm text-gray-500">Top Style</div>
      </div>
      
      <div className="text-center">
        <div className="text-lg font-bold text-orange-600">{analytics.topModel}</div>
        <div className="text-sm text-gray-500">Top Model</div>
      </div>
    </div>
  );
}