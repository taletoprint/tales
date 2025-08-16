import { ArtStyle } from '@/lib/types';

interface ArtStyleIconProps {
  style: ArtStyle;
  className?: string;
  selected?: boolean;
}

const iconMap = {
  [ArtStyle.WATERCOLOUR]: '/images/icons/watercolor.svg',
  [ArtStyle.OIL_PAINTING]: '/images/icons/oil-paint.svg',
  [ArtStyle.PASTEL]: '/images/icons/pastel.svg',
  [ArtStyle.PENCIL_INK]: '/images/icons/pencil.svg',
  [ArtStyle.STORYBOOK]: '/images/icons/storybook.svg',
  [ArtStyle.IMPRESSIONIST]: '/images/icons/palette.svg',
};

export const ArtStyleIcon: React.FC<ArtStyleIconProps> = ({ 
  style, 
  className = '',
  selected = false 
}) => {
  const iconSrc = iconMap[style];
  
  if (!iconSrc) {
    console.warn(`No icon found for art style: ${style}`);
    return null;
  }

  // CSS filter to convert black SVG to terracotta color (#d97706 approximation)
  const terracottaFilter = 'brightness(0) saturate(100%) invert(52%) sepia(81%) saturate(2032%) hue-rotate(12deg) brightness(98%) contrast(93%)';
  // CSS filter for neutral grey color
  const greyFilter = 'brightness(0) saturate(100%) invert(35%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(70%) contrast(100%)';

  return (
    <div 
      className={`
        w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 transition-all duration-200
        ${className}
      `}
    >
      <img 
        src={iconSrc}
        alt={`${style} icon`}
        className="w-full h-full object-contain transition-all duration-200"
        style={{
          filter: selected ? terracottaFilter : greyFilter
        }}
      />
    </div>
  );
};