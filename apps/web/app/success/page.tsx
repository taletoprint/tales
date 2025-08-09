"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface OrderDetails {
  id: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    postal_code: string;
    country: string;
  };
  artworkDetails: {
    style: string;
    aspect: string;
    story: string;
  };
  estimatedDelivery: string;
}

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchOrderDetails(sessionId);
    }
  }, [sessionId]);

  const fetchOrderDetails = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/orders/details?session_id=${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setOrderDetails(data.order);
      } else {
        setError(data.error || 'Failed to load order details');
      }
    } catch (err) {
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-lg border border-warm-grey/10 p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-sage border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-charcoal">Processing your order...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-lg border border-warm-grey/10 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h1 className="text-2xl font-serif font-semibold text-charcoal mb-4">
              Something went wrong
            </h1>
            <p className="text-charcoal/70 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-terracotta text-cream rounded-xl hover:bg-charcoal transition-colors font-medium"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-warm-grey/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-serif font-semibold text-charcoal">
                TaleToPrint
              </h1>
            </Link>
          </div>
        </div>
      </header>

      {/* Success Content */}
      <section className="pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-warm-grey/10 p-8 text-center mb-8">
            <div className="w-20 h-20 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎉</span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-serif font-semibold text-charcoal mb-4">
              Order Confirmed!
            </h1>
            
            <p className="text-lg text-charcoal/80 mb-8">
              Thank you for your purchase! Your beautiful art print is now being prepared for delivery.
            </p>

            {orderDetails && (
              <div className="bg-cream/50 rounded-xl p-6 text-left mb-8">
                <h3 className="font-serif font-semibold text-lg text-charcoal mb-4">Order Details</h3>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-charcoal">Order ID:</span>
                    <span className="ml-2 text-charcoal/70">{orderDetails.id}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-charcoal">Art Style:</span>
                    <span className="ml-2 text-charcoal/70 capitalize">{orderDetails.artworkDetails.style.replace('_', ' ')}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-charcoal">Format:</span>
                    <span className="ml-2 text-charcoal/70">{orderDetails.artworkDetails.aspect.replace('_', ' ')}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-charcoal">Delivery to:</span>
                    <div className="ml-2 text-charcoal/70">
                      {orderDetails.customerName}<br />
                      {orderDetails.shippingAddress.line1}<br />
                      {orderDetails.shippingAddress.line2 && (
                        <>{orderDetails.shippingAddress.line2}<br /></>
                      )}
                      {orderDetails.shippingAddress.city}, {orderDetails.shippingAddress.postal_code}<br />
                      {orderDetails.shippingAddress.country}
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-charcoal">Estimated Delivery:</span>
                    <span className="ml-2 text-charcoal/70">{orderDetails.estimatedDelivery}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href="/"
                className="px-6 py-3 bg-sage text-cream rounded-xl hover:bg-charcoal transition-colors font-medium"
              >
                Create Another Print
              </Link>
              
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-warm-grey/20 text-charcoal rounded-xl hover:bg-warm-grey/30 transition-colors font-medium"
              >
                Print Receipt
              </button>
            </div>
          </div>

          {/* What happens next */}
          <div className="bg-white rounded-2xl shadow-lg border border-warm-grey/10 p-8">
            <h3 className="font-serif font-semibold text-xl text-charcoal mb-6 text-center">
              What happens next?
            </h3>
            
            <div className="space-y-6">
              {[
                {
                  step: "1",
                  title: "High-quality generation",
                  description: "We're creating your artwork at 8K resolution for premium print quality.",
                  icon: "🎨"
                },
                {
                  step: "2",
                  title: "Professional printing",
                  description: "Your art is printed on premium archival paper using professional-grade equipment.",
                  icon: "🖨️"
                },
                {
                  step: "3",
                  title: "Careful packaging",
                  description: "We package your print with care to ensure it arrives in perfect condition.",
                  icon: "📦"
                },
                {
                  step: "4",
                  title: "Express delivery",
                  description: "Your print will be delivered within 3-5 business days via Royal Mail.",
                  icon: "🚚"
                }
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-terracotta/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-lg">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-charcoal mb-1">{item.title}</h4>
                    <p className="text-sm text-charcoal/70">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}