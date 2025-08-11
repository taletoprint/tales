"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { PreviewResult, PrintSize } from '@/lib/types';
import { getProductSpec } from '@/lib/prodigi-client';

interface PreviewDisplayProps {
  preview: PreviewResult;
  onSelectForPurchase: () => void;
}

export const PreviewDisplay: React.FC<PreviewDisplayProps> = ({ 
  preview, 
  onSelectForPurchase 
}) => {
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  // Set default print size based on aspect ratio
  const getDefaultPrintSize = (): PrintSize => {
    const aspect = (preview as any).aspect;
    return aspect === 'square' ? ('SQUARE_8X8' as unknown as PrintSize) : ('A4' as unknown as PrintSize);
  };
  
  const [selectedPrintSize, setSelectedPrintSize] = useState<PrintSize>(getDefaultPrintSize());

  // Update default print size when preview changes
  useEffect(() => {
    setSelectedPrintSize(getDefaultPrintSize());
  }, [preview.id]);


  const handlePurchase = async () => {
    setPurchaseLoading(true);
    
    try {
      // Use selected print size
      const printSize = selectedPrintSize;
      
      // Create Stripe checkout session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewData: preview, printSize })
      });
      
      const data = await response.json();
      
      if (data.success && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        console.error('Checkout failed:', data.error);
        alert(`Checkout failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Checkout request failed:', error);
      alert('Checkout request failed. Please try again.');
    } finally {
      setPurchaseLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 lg:items-start">
        {/* Preview Image */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-warm-grey/10 self-start">
          <div className={`relative ${
            (preview as any).aspect === 'A3_landscape' ? 'aspect-[1448/1024]' : // A3 landscape (1448×1024)
            (preview as any).aspect === 'A3_portrait' ? 'aspect-[1024/1448]' :   // A3 portrait (1024×1448)
            (preview as any).aspect === 'A2_portrait' ? 'aspect-[1024/1448]' :   // A2 portrait (same as A3)
            'aspect-square' // Square (1024×1024)
          }`}>
            {preview.imageUrl ? (
              <Image
                src={preview.imageUrl}
                alt="Your story as art"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <p className="text-gray-500">Loading image...</p>
              </div>
            )}
          </div>
        </div>

        {/* Purchase Details */}
        <div>
          <div className="mb-8">
            <h3 className="text-3xl lg:text-4xl font-serif font-semibold text-charcoal mb-4">
              Your Story, <span className="text-terracotta">Transformed</span>
            </h3>
            <p className="text-lg text-charcoal/80 leading-relaxed">
              This is a low-resolution preview. Purchase to receive a museum-quality print without watermarks, delivered to your door.
            </p>
          </div>
          
          {/* Print Size Selector */}
          <div className="mb-8">
            <h4 className="font-serif font-semibold text-lg text-charcoal mb-4">Choose your print size:</h4>
            <div className="grid gap-3">
              {(() => {
                // Show different sizes based on image aspect ratio
                const aspect = (preview as any).aspect;
                const availableSizes: PrintSize[] = aspect === 'square' 
                  ? (['SQUARE_8X8', 'SQUARE_10X10'] as unknown as PrintSize[])
                  : (['A4', 'A3'] as unknown as PrintSize[]);
                
                return availableSizes.map((size) => {
                  const spec = getProductSpec(size);
                  const price = (spec.retailPrice / 100).toFixed(2);
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedPrintSize(size)}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        selectedPrintSize === size
                          ? 'border-terracotta bg-terracotta/5 shadow-md'
                          : 'border-warm-grey/30 hover:border-sage hover:shadow-md'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-serif font-medium text-charcoal">{spec.name}</div>
                          <div className="text-sm text-charcoal/70">{spec.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-charcoal">£{price}</div>
                        </div>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          <div className="bg-cream/50 rounded-2xl p-6 mb-8">
            <h4 className="font-serif font-semibold text-lg text-charcoal mb-4">What you'll receive:</h4>
            <ul className="space-y-3">
              {[
                { icon: '🎨', text: 'HD quality artwork (8K resolution)' },
                { icon: '📜', text: 'Printed on premium archival paper' },
                { icon: '🇬🇧', text: 'Printed in the UK within 48 hours' },
                { icon: '🚚', text: 'Free UK delivery (3-5 days)' },
                { icon: '✅', text: '100% satisfaction guarantee' },
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-charcoal">
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={handlePurchase}
              disabled={purchaseLoading}
              className="w-full px-8 py-4 bg-terracotta text-cream rounded-xl hover:bg-charcoal transition-all duration-250 font-medium text-xl transform hover:-translate-y-1 shadow-lg hover:shadow-xl disabled:bg-warm-grey disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {purchaseLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Redirecting to checkout...
                </span>
              ) : (
                (() => {
                  const productSpec = getProductSpec(selectedPrintSize);
                  const price = (productSpec.retailPrice / 100).toFixed(2);
                  return `Purchase ${productSpec.name} - £${price}`;
                })()
              )}
            </button>
            
            <div className="flex items-center justify-center gap-4 text-sm text-sage">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Secure checkout
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                No subscription
              </div>
            </div>
            
            <p className="text-center text-sm text-charcoal/60">
              One-time purchase • Money-back guarantee • UK company
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};