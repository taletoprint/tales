"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrderDetails {
  id: string;
  email: string;
  status: string;
  price: number;
  currency: string;
  createdAt: string;
  printSize: string;
  hdImageUrl?: string;
  printAssetUrl?: string;
  metadata?: {
    story?: string;
    style?: string;
    aspect?: string;
    previewUrl?: string;
    refinedPrompt?: string;
  };
}

export default function ApprovalsPage() {
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders?status=AWAITING_APPROVAL');
      const data = await response.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch pending orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    setProcessing(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: 'POST',
      });
      
      const data = await response.json();
      if (data.success) {
        // Remove from list
        setOrders(prev => prev.filter(order => order.id !== orderId));
        alert('Order approved and sent to Prodigi!');
      } else {
        alert(`Approval failed: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to approve order');
    } finally {
      setProcessing(null);
    }
  };

  const handleRegenerate = async (orderId: string) => {
    if (!confirm('This will regenerate the HD print file. Continue?')) return;
    
    setProcessing(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/regenerate`, {
        method: 'POST',
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh the orders to show updated files
        await fetchPendingOrders();
        alert('HD file regenerated successfully!');
      } else {
        alert(`Regeneration failed: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to regenerate HD file');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-blue-600 hover:text-blue-800 mr-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                Order Approvals ({orders.length})
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {orders.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders awaiting approval</h3>
            <p className="mt-1 text-sm text-gray-500">All orders have been processed!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Order {order.id}</h3>
                      <p className="text-sm text-gray-500">
                        {order.email} • {order.printSize} • £{(order.price / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRegenerate(order.id)}
                        disabled={processing === order.id}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded hover:bg-yellow-200 disabled:opacity-50"
                      >
                        {processing === order.id ? 'Processing...' : 'Regenerate HD'}
                      </button>
                      <button
                        onClick={() => handleApprove(order.id)}
                        disabled={processing === order.id}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {processing === order.id ? 'Processing...' : 'Approve & Send to Print'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* User Story & Prompt */}
                    <div className="lg:col-span-1">
                      <h4 className="font-medium text-gray-900 mb-2">Customer Story</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded mb-4">
                        "{order.metadata?.story || 'No story provided'}"
                      </p>
                      
                      <h4 className="font-medium text-gray-900 mb-2">AI Prompt Used</h4>
                      <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded mb-4 font-mono">
                        {order.metadata?.refinedPrompt || 'No prompt available'}
                      </p>
                      
                      <div className="text-xs text-gray-500">
                        <p>Style: {order.metadata?.style || 'Unknown'}</p>
                        <p>Aspect: {order.metadata?.aspect || 'Unknown'}</p>
                        <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Preview Image */}
                    <div className="lg:col-span-1">
                      <h4 className="font-medium text-gray-900 mb-2">Original Preview</h4>
                      {order.metadata?.previewUrl ? (
                        <div className="relative">
                          <img
                            src={order.metadata.previewUrl}
                            alt="Preview"
                            className="w-full rounded-lg shadow border"
                          />
                          <a
                            href={order.metadata.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 text-xs rounded hover:bg-opacity-75"
                          >
                            View Full Size
                          </a>
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                          <p className="text-gray-500">No preview available</p>
                        </div>
                      )}
                    </div>

                    {/* HD Print File */}
                    <div className="lg:col-span-1">
                      <h4 className="font-medium text-gray-900 mb-2">HD Print File</h4>
                      {order.hdImageUrl ? (
                        <div className="relative">
                          <img
                            src={order.hdImageUrl}
                            alt="HD Print"
                            className="w-full rounded-lg shadow border"
                          />
                          <div className="absolute top-2 right-2 flex gap-1">
                            <a
                              href={order.hdImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-black bg-opacity-50 text-white px-2 py-1 text-xs rounded hover:bg-opacity-75"
                            >
                              HD Image
                            </a>
                            {order.printAssetUrl && (
                              <a
                                href={order.printAssetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-500 bg-opacity-75 text-white px-2 py-1 text-xs rounded hover:bg-opacity-90"
                              >
                                Print File
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                          <p className="text-gray-500">HD file not generated</p>
                        </div>
                      )}
                      
                      <div className="mt-2 text-xs text-gray-500">
                        <p>Print Size: {order.printSize}</p>
                        <p>Status: Awaiting Approval</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}