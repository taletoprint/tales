'use client';

import { useState } from 'react';

interface QueueStats {
  pending?: number;
  running?: number;
  completed?: number;
  failed?: number;
  dead?: number;
}

export default function QueueManagementPage() {
  const [stats, setStats] = useState<QueueStats>({});
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/queue/process-s3-uploads');
      const data = await response.json();
      setStats(data.stats || {});
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const triggerProcessing = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/admin/queue/trigger', { method: 'POST' });
      const result = await response.json();
      setLastResult(result);
      await fetchStats(); // Refresh stats after processing
    } catch (error) {
      console.error('Failed to trigger processing:', error);
      setLastResult({ error: 'Failed to trigger processing' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">S3 Upload Queue Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Queue Stats */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Queue Statistics</h2>
          <button 
            onClick={fetchStats}
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Stats
          </button>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Pending:</span>
              <span className="font-mono">{stats.pending || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Running:</span>
              <span className="font-mono">{stats.running || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed:</span>
              <span className="font-mono text-green-600">{stats.completed || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Failed:</span>
              <span className="font-mono text-red-600">{stats.failed || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Dead:</span>
              <span className="font-mono text-red-800">{stats.dead || 0}</span>
            </div>
          </div>
        </div>

        {/* Manual Processing */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Manual Processing</h2>
          <button 
            onClick={triggerProcessing}
            disabled={processing}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Trigger Queue Processing'}
          </button>
          
          {lastResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h3 className="font-medium mb-2">Last Result:</h3>
              <pre className="text-sm text-gray-700 overflow-auto">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <h3 className="font-semibold text-yellow-800">About the Queue</h3>
        <p className="text-yellow-700 mt-1">
          This queue processes preview images from Replicate URLs and uploads them to S3 with metadata files. 
          The admin gallery reads from these S3 metadata files to display recent previews.
        </p>
      </div>
    </div>
  );
}