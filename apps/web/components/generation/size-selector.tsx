"use client";

import React from 'react';
import { getProductSpec, PrintSize } from '@/lib/prodigi-client';
import { Aspect } from '@/lib/types';

interface SizeSelectorProps {
  value: PrintSize;
  onChange: (size: PrintSize) => void;
  aspect: Aspect;
  onAspectChange: (aspect: Aspect) => void;
}

export const SizeSelector: React.FC<SizeSelectorProps> = ({ value, onChange, aspect, onAspectChange }) => {
  const sizes = [
    {
      value: 'A4' as PrintSize,
      spec: getProductSpec('A4'),
      icon: '📄',
      popular: false,
    },
    {
      value: 'A3' as PrintSize, 
      spec: getProductSpec('A3'),
      icon: '🖼️',
      popular: true,
    },
  ];

  const formatPrice = (pencePrice: number) => {
    return `£${(pencePrice / 100).toFixed(2)}`;
  };

  const orientations = [
    { value: 'A3_portrait' as Aspect, label: 'Portrait', icon: '📱' },
    { value: 'A3_landscape' as Aspect, label: 'Landscape', icon: '🖥️' },
    { value: 'square' as Aspect, label: 'Square', icon: '⬜' },
  ];

  return (
    <div className="space-y-6">
      {/* Size Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sizes.map((sizeOption) => (
        <button
          key={sizeOption.value}
          onClick={() => onChange(sizeOption.value)}
          className={`relative p-6 border-2 rounded-xl text-left transition-all hover:transform hover:-translate-y-1 shadow-sm hover:shadow-lg ${
            value === sizeOption.value
              ? 'border-terracotta bg-terracotta/5 shadow-md'
              : 'border-warm-grey/30 hover:border-sage'
          }`}
        >
          {sizeOption.popular && (
            <div className="absolute -top-2 -right-2 bg-terracotta text-cream text-xs px-2 py-1 rounded-full font-medium">
              Popular
            </div>
          )}
          
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{sizeOption.icon}</span>
              <div>
                <h3 className="font-serif font-semibold text-lg text-charcoal">
                  {sizeOption.spec.name}
                </h3>
                <p className="text-sm text-charcoal/70">
                  {sizeOption.spec.dimensions.width}×{sizeOption.spec.dimensions.height}mm
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-serif font-bold text-terracotta">
                {formatPrice(sizeOption.spec.retailPrice)}
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className={`bg-warm-grey/20 rounded border mx-auto ${
              sizeOption.value === 'A4' ? 'w-12 h-16' : 'w-16 h-20'
            }`}></div>
          </div>
          
          <div className="space-y-2 text-sm text-charcoal/70">
            <p>{sizeOption.spec.description}</p>
            <div className="flex items-center gap-2 text-sage">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Free UK delivery</span>
            </div>
          </div>
        </button>
        ))}
      </div>
      
      {/* Orientation Selection */}
      <div>
        <label className="block text-md font-medium text-charcoal mb-3">
          Choose orientation
        </label>
        <div className="grid grid-cols-3 gap-3">
          {orientations.map((orientation) => (
            <button
              key={orientation.value}
              onClick={() => onAspectChange(orientation.value)}
              className={`p-4 border-2 rounded-xl text-center transition-all hover:transform hover:-translate-y-0.5 ${
                aspect === orientation.value
                  ? 'border-terracotta bg-terracotta/5 shadow-md'
                  : 'border-warm-grey/30 hover:border-sage hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-xl">{orientation.icon}</span>
                <div className="font-medium text-charcoal font-serif text-sm">{orientation.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SizeSelector;