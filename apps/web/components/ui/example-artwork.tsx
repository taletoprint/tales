import Image from 'next/image';
import { useState } from 'react';
import { ArtStyle } from '@/lib/types';

interface ExampleArtworkProps {
  src: string;
  alt: string;
  style: string;
  priority?: boolean;
  className?: string;
  showStyleLabel?: boolean;
  showHoverOverlay?: boolean;
  onClick?: () => void;
}

export function ExampleArtwork({
  src,
  alt,
  style,
  priority = false,
  className = '',
  showStyleLabel = true,
  showHoverOverlay = false,
  onClick
}: ExampleArtworkProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadComplete = () => {
    setIsLoading(false);
  };

  const styleLabels: { [key: string]: { name: string; color: string } } = {
    watercolour: { name: 'Watercolour', color: 'bg-blue-100 text-blue-800' },
    oil: { name: 'Oil Painting', color: 'bg-amber-100 text-amber-800' },
    impressionist: { name: 'Impressionist', color: 'bg-purple-100 text-purple-800' },
    storybook: { name: 'Storybook', color: 'bg-green-100 text-green-800' },
    pastel: { name: 'Pastel', color: 'bg-pink-100 text-pink-800' },
    pencil: { name: 'Pencil & Ink', color: 'bg-gray-100 text-gray-800' }
  };

  const label = styleLabels[style] || { name: style, color: 'bg-gray-100 text-gray-800' };

  return (
    <div 
      className={`relative group cursor-pointer overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${className}`}
      onClick={onClick}
    >
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 bg-cream animate-pulse rounded-xl" />
      )}
      
      {/* Main image */}
      <div className="relative aspect-square">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className={`object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          } group-hover:scale-105 transition-transform duration-300`}
          priority={priority}
          onLoad={handleLoadComplete}
          quality={85}
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
        
        {/* Style label */}
        {showStyleLabel && (
          <div className="absolute top-3 left-3 z-10">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${label.color}`}>
              {label.name}
            </span>
          </div>
        )}
        
        {/* Hover overlay with "View Style" */}
        {showHoverOverlay && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="bg-white text-charcoal px-4 py-2 rounded-lg font-medium text-sm shadow-lg">
              View Style
            </span>
          </div>
        )}
      </div>
      
      {/* Bottom gradient overlay for better text visibility */}
      {showStyleLabel && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
      )}
    </div>
  );
}

// Predefined example artwork data
export const EXAMPLE_ARTWORKS = [
  {
    src: '/images/examples/watercolour01_Soft_dreamy_watercolour_painting_of_a_barefoot_6d899b94-39dc-456b-b311-0ec112d94f9f.png',
    alt: 'Soft dreamy watercolour painting perfect for personalised gifts and custom wall art',
    style: 'watercolour',
    story: 'A peaceful moment by the water'
  },
  {
    src: '/images/examples/Oil01_Rich_detailed_oil_painting_of_a_warm_farmhou_9f2311bc-d0d8-45f4-b2f3-67c48046f78f_0.png',
    alt: 'Rich detailed oil painting farmhouse scene - custom art print example',
    style: 'oil',
    story: 'A cozy farmhouse in autumn'
  },
  {
    src: '/images/examples/impressionist02_Romantic_impressionist_painting_of_a_couple__bfe300f4-750c-4480-b6e7-a3c30d403885_2.png',
    alt: 'Romantic impressionist painting of couple - personalised artwork gift',
    style: 'impressionist',
    story: 'A romantic evening stroll'
  },
  {
    src: '/images/examples/storybook01_Whimsical_storybook_illustration_of_a_babys__dfe69dd9-14b0-440b-8a32-aebf58192c76_1.png',
    alt: 'Whimsical storybook illustration perfect for nursery art and family gifts',
    style: 'storybook',
    story: 'Baby\'s first adventure'
  },
  {
    src: '/images/examples/chalk01_Charming_pastel_illustration_of_a_blooming_s_4fa50ac1-ac81-40d6-8ad1-7bc1eac12c23_0.png',
    alt: 'Charming pastel illustration with soft chalky texture - custom art gift',
    style: 'pastel',
    story: 'Spring garden in bloom'
  },
  {
    src: '/images/examples/pen01_Elegant_pencil_and_ink_sketch_of_a_cobbled_I_1183204d-752a-4de5-969f-882b18ba82bc_2.png',
    alt: 'Elegant pencil and ink sketch - black and white custom artwork print',
    style: 'pencil',
    story: 'Old town cobblestone streets'
  }
];

// Component for hero showcase (smaller, priority loading)
export function HeroArtworkShowcase({ className = '' }: { className?: string }) {
  const heroExamples = EXAMPLE_ARTWORKS.slice(0, 4); // Show 4 in hero

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {heroExamples.map((artwork, index) => (
        <ExampleArtwork
          key={index}
          src={artwork.src}
          alt={artwork.alt}
          style={artwork.style}
          priority={index < 2} // Priority load first 2 images
          className="h-32 sm:h-40"
          showStyleLabel={false} // Cleaner look for hero
          showHoverOverlay={false} // No hover overlay for hero
        />
      ))}
    </div>
  );
}

// Map example artwork styles to ArtStyle enum
const styleMapping: { [key: string]: ArtStyle } = {
  watercolour: ArtStyle.WATERCOLOUR,
  oil: ArtStyle.OIL_PAINTING,
  impressionist: ArtStyle.IMPRESSIONIST,
  storybook: ArtStyle.STORYBOOK,
  pastel: ArtStyle.PASTEL,
  pencil: ArtStyle.PENCIL_INK,
};

// Component for full gallery section
export function ExampleGallery({ className = '' }: { className?: string }) {
  const handleStyleClick = (style: string) => {
    const artStyle = styleMapping[style];
    if (artStyle) {
      // Set the selected style in localStorage for the StoryInput component to pick up
      localStorage.setItem('taletoprint_selected_style', artStyle);
      // Dispatch a custom event to notify the StoryInput component
      window.dispatchEvent(new CustomEvent('styleSelected', { detail: artStyle }));
    }
    // Scroll to creation form
    document.getElementById('create')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 ${className}`}>
      {EXAMPLE_ARTWORKS.map((artwork, index) => (
        <ExampleArtwork
          key={index}
          src={artwork.src}
          alt={artwork.alt}
          style={artwork.style}
          priority={false} // Lazy load gallery images
          showStyleLabel={true}
          showHoverOverlay={true} // Show hover overlay for gallery
          onClick={() => handleStyleClick(artwork.style)}
        />
      ))}
    </div>
  );
}