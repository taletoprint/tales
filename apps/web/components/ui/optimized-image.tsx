"use client";

import { useState } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function OptimizedImage({ 
  src, 
  alt, 
  width = 400, 
  height = 600, 
  className = "", 
  priority = false 
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  
  // Create different format versions
  const getImageSources = (baseSrc: string) => {
    const withoutExtension = baseSrc.replace(/\.[^/.]+$/, "");
    return {
      avif: `${withoutExtension}.avif`,
      webp: `${withoutExtension}.webp`, 
      png: baseSrc
    };
  };

  const sources = getImageSources(imageSrc);

  return (
    <picture>
      {/* Modern formats with fallbacks */}
      <source srcSet={sources.avif} type="image/avif" />
      <source srcSet={sources.webp} type="image/webp" />
      <Image
        src={sources.png}
        alt={alt}
        width={width}
        height={height}
        className={className}
        priority={priority}
        onError={() => {
          // Fallback to PNG if other formats fail
          setImageSrc(sources.png);
        }}
      />
    </picture>
  );
}