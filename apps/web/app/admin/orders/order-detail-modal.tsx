'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Order {
  id: string;
  createdAt: string;
  email: string;
  printSize: string;
  price: number;
  currency: string;
  status: string;
  paymentStatus: string;
  prodigiOrderId?: string;
  hdImageUrl?: string;
  printAssetUrl?: string;
  trackingNumber?: string;
  shippingAddress: any;
  preview?: {
    story: string;
    style: string;
    imageUrl: string;
  };
}

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onUpdate: () => void;
}

export default function OrderDetailModal({ order, onClose, onUpdate }: OrderDetailModalProps) {
  const [actionLoading, setActionLoading] = useState(false);

  const formatPrice = (price: number, currency: string) => {
    return `${currency === 'GBP' ? '£' : '$'}${(price / 100).toFixed(2)}`;
  };

  const handleRetry = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/retry`, {
        method: 'POST',
      });
      
      if (response.ok) {
        onUpdate();
        onClose();
      } else {
        const data = await response.json();
        alert(`Retry failed: ${data.error}`);
      }
    } catch (error) {
      alert('Retry failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this order for printing? This will send it to Prodigi for fulfillment.')) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/approve`, {
        method: 'POST',
      });
      
      if (response.ok) {
        onUpdate();
        onClose();
      } else {
        const data = await response.json();
        alert(`Approval failed: ${data.error}`);
      }
    } catch (error) {
      alert('Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!confirm('Are you sure you want to refund this order?')) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: 'POST',
      });
      
      if (response.ok) {
        onUpdate();
        onClose();
      } else {
        const data = await response.json();
        alert(`Refund failed: ${data.error}`);
      }
    } catch (error) {
      alert('Refund failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Order Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Order Information</h4>
              <dl className="text-sm">
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Order ID:</dt>
                  <dd className="text-gray-900 font-mono">{order.id}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Created:</dt>
                  <dd className="text-gray-900">{new Date(order.createdAt).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Price:</dt>
                  <dd className="text-gray-900">{formatPrice(order.price, order.currency)}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Print Size:</dt>
                  <dd className="text-gray-900">{order.printSize}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Payment:</dt>
                  <dd className="text-gray-900">{order.paymentStatus}</dd>
                </div>
                {order.prodigiOrderId && (
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-500">Prodigi ID:</dt>
                    <dd className="text-gray-900 font-mono">{order.prodigiOrderId}</dd>
                  </div>
                )}
                {order.trackingNumber && (
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-500">Tracking:</dt>
                    <dd className="text-gray-900 font-mono">{order.trackingNumber}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Details</h4>
              <dl className="text-sm">
                <div className="py-1">
                  <dt className="text-gray-500">Email:</dt>
                  <dd className="text-gray-900">{order.email}</dd>
                </div>
                <div className="py-1">
                  <dt className="text-gray-500">Shipping Address:</dt>
                  <dd className="text-gray-900">
                    {order.shippingAddress?.name}<br />
                    {order.shippingAddress?.line1}<br />
                    {order.shippingAddress?.line2 && <>{order.shippingAddress.line2}<br /></>}
                    {order.shippingAddress?.city}, {order.shippingAddress?.postalCode}<br />
                    {order.shippingAddress?.country}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {order.preview && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Artwork Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dl className="text-sm">
                    <div className="py-1">
                      <dt className="text-gray-500">Story:</dt>
                      <dd className="text-gray-900">{order.preview.story}</dd>
                    </div>
                    <div className="py-1">
                      <dt className="text-gray-500">Style:</dt>
                      <dd className="text-gray-900">{order.preview.style}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <Image
                    src={order.preview.imageUrl}
                    alt="Order preview"
                    width={200}
                    height={200}
                    className="rounded-lg object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              Status: {order.status}
            </div>
            <div className="flex space-x-2">
              {order.status === 'PRINT_READY' && (
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {actionLoading ? 'Approving...' : 'Approve for Print'}
                </button>
              )}
              {(order.status === 'FAILED' || order.status === 'PENDING') && (
                <button
                  onClick={handleRetry}
                  disabled={actionLoading}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {actionLoading ? 'Retrying...' : 'Retry'}
                </button>
              )}
              {order.status !== 'REFUNDED' && order.paymentStatus === 'paid' && (
                <button
                  onClick={handleRefund}
                  disabled={actionLoading}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Refund'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}