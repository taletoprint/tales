'use client';

import { useState, useEffect } from 'react';

interface HealthData {
  database: { status: string; latency?: number };
  stripe: { status: string };
  replicate: { status: string };
  s3: { status: string };
  prodigi: { status: string };
}

export default function SystemHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/admin/health');
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Failed to fetch health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✓';
      case 'warning': return '⚠';
      case 'error': return '✗';
      default: return '?';
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading health status...</div>;
  }

  if (!health) {
    return <div className="text-red-600">Health check failed</div>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(health).map(([service, data]) => (
        <div key={service} className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 capitalize">
            {service}
          </span>
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${getStatusColor(data.status)}`}>
              {getStatusIcon(data.status)} {data.status}
            </span>
            {data.latency && (
              <span className="text-xs text-gray-500">
                {data.latency}ms
              </span>
            )}
          </div>
        </div>
      ))}
      
      <div className="pt-2 border-t text-xs text-gray-500">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}