import { useState, useEffect } from 'react';
import { ArtStyle } from '@/lib/types';

interface ProgressIndicatorProps {
  artStyle: ArtStyle;
  isActive: boolean;
  className?: string;
}

// Style-specific progress messages
const PROGRESS_STAGES = {
  [ArtStyle.WATERCOLOUR]: [
    "Preparing your story...",
    "Mixing watercolour paints...",
    "Loading artistic brushes...",
    "Painting your memory...",
    "Adding final details..."
  ],
  [ArtStyle.OIL_PAINTING]: [
    "Preparing your story...",
    "Preparing oil paints...",
    "Loading canvas textures...",
    "Creating your painting...",
    "Adding finishing touches..."
  ],
  [ArtStyle.PASTEL]: [
    "Preparing your story...",
    "Selecting chalk pastels...",
    "Loading textured paper...",
    "Sketching your memory...",
    "Blending final details..."
  ],
  [ArtStyle.IMPRESSIONIST]: [
    "Preparing your story...",
    "Capturing light and movement...",
    "Loading impressionist techniques...",
    "Painting with visible brushstrokes...",
    "Adding atmospheric effects..."
  ],
  [ArtStyle.STORYBOOK]: [
    "Preparing your story...",
    "Creating whimsical characters...",
    "Loading storybook magic...",
    "Illustrating your tale...",
    "Adding enchanting details..."
  ],
  [ArtStyle.PENCIL_INK]: [
    "Preparing your story...",
    "Sharpening pencils and pens...",
    "Loading fine drawing tools...",
    "Sketching with precision...",
    "Adding intricate line work..."
  ]
};

// Timing for each stage (in milliseconds)
const STAGE_DURATIONS = [2000, 2500, 3000, 5000, 3000]; // Total: ~15.5 seconds

export function ProgressIndicator({ artStyle, isActive, className = '' }: ProgressIndicatorProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const messages = PROGRESS_STAGES[artStyle] || PROGRESS_STAGES[ArtStyle.WATERCOLOUR];

  useEffect(() => {
    if (!isActive) {
      setCurrentStage(0);
      setProgress(0);
      return;
    }

    let timeouts: NodeJS.Timeout[] = [];
    let progressInterval: NodeJS.Timeout;
    
    // Start progress animation
    let progressValue = 0;
    progressInterval = setInterval(() => {
      progressValue += 0.5; // Increment by 0.5% every 75ms
      if (progressValue >= 95) progressValue = 95; // Don't reach 100% until complete
      setProgress(progressValue);
    }, 75);

    // Stage progression
    let accumulatedTime = 0;
    STAGE_DURATIONS.forEach((duration, index) => {
      const timeout = setTimeout(() => {
        setCurrentStage(index);
      }, accumulatedTime);
      
      timeouts.push(timeout);
      accumulatedTime += duration;
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      clearInterval(progressInterval);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress message with icon */}
      <div className="flex items-center justify-center gap-3">
        {/* Animated spinner */}
        <div className="relative">
          <svg 
            className="animate-spin w-6 h-6 text-terracotta" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          {/* Pulsing dot in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-terracotta rounded-full animate-pulse" />
          </div>
        </div>

        {/* Current message */}
        <span className="text-lg font-medium text-charcoal">
          {messages[currentStage]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-warm-grey/20 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-terracotta to-sage transition-all duration-300 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage indicator dots */}
      <div className="flex justify-center items-center gap-2">
        {messages.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index <= currentStage 
                ? 'bg-terracotta scale-110' 
                : 'bg-warm-grey/30 scale-100'
            }`}
          />
        ))}
      </div>

      {/* Subtle estimated time */}
      <div className="text-center">
        <span className="text-sm text-charcoal/60">
          Creating high-quality artwork • Usually takes 10-15 seconds
        </span>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactProgressIndicator({ artStyle, isActive, className = '' }: ProgressIndicatorProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const messages = PROGRESS_STAGES[artStyle] || PROGRESS_STAGES[ArtStyle.WATERCOLOUR];

  useEffect(() => {
    if (!isActive) {
      setCurrentStage(0);
      return;
    }

    let timeouts: NodeJS.Timeout[] = [];
    let accumulatedTime = 0;
    
    STAGE_DURATIONS.forEach((duration, index) => {
      const timeout = setTimeout(() => {
        setCurrentStage(index);
      }, accumulatedTime);
      
      timeouts.push(timeout);
      accumulatedTime += duration;
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <svg className="animate-spin w-5 h-5 text-terracotta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span className="text-base font-medium text-charcoal">
        {messages[currentStage]}
      </span>
    </div>
  );
}