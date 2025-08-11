"use client";

import React, { useState } from 'react';
import { PreviewResult, ArtStyle, Aspect } from '@/lib/types';
import { PrintSize } from '@/lib/prodigi-client';
import SizeSelector from './size-selector';

interface StoryInputProps {
  onPreview: (preview: PreviewResult) => void;
  maxFreeAttempts?: number;
  currentAttempts: number;
  hasPreview?: boolean;
}

export const StoryInput: React.FC<StoryInputProps> = ({ 
  onPreview, 
  maxFreeAttempts = 3,
  currentAttempts,
  hasPreview = false
}) => {
  const [story, setStory] = useState('');
  const [style, setStyle] = useState<ArtStyle>(ArtStyle.WATERCOLOUR);
  const [aspect, setAspect] = useState<Aspect>("A3_portrait"); // Default to portrait for prints
  const [loading, setLoading] = useState(false);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleGeneratePreview = async () => {
    if (currentAttempts >= maxFreeAttempts) {
      setShowEmailGate(true);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/preview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story, style, aspect })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === 'RATE_LIMITED') {
          setShowUpgradePrompt(true);
        } else {
          setError(data.message || 'Failed to generate preview');
        }
        return;
      }
      
      onPreview(data.preview);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-warm-grey/10 p-8">        
        <div className="space-y-6">
          <div>
            <label htmlFor="story" className="block text-lg font-serif font-medium text-charcoal mb-3">
              Tell us your special memory
            </label>
            <textarea
              id="story"
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="My grandmother's garden was a magical place where time stood still. Every summer, she would take me there to pick roses..."
              className="w-full h-40 p-6 border-2 border-warm-grey/30 rounded-xl focus:border-terracotta focus:ring-0 resize-none text-charcoal placeholder-charcoal/50 transition-colors"
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="text-sm text-charcoal/60">
                {story.length}/500 characters
              </div>
              {story.length >= 20 && (
                <div className="text-sm text-sage flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Ready to create
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-lg font-serif font-medium text-charcoal mb-3">
              Choose your art style
            </label>
            <StyleSelector value={style} onChange={setStyle} />
          </div>
          
          <div>
            <label className="block text-lg font-serif font-medium text-charcoal mb-3">
              Choose orientation
            </label>
            <AspectSelector value={aspect} onChange={setAspect} />
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
          
          <div className="bg-cream/50 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-charcoal">
                Free previews remaining today
              </span>
              <span className="text-lg font-serif font-semibold text-terracotta">
                {maxFreeAttempts - currentAttempts}
              </span>
            </div>
            
            <button
              onClick={handleGeneratePreview}
              disabled={loading || !story.trim() || story.length < 20}
              className={`w-full px-6 py-4 rounded-xl transition-all duration-250 font-medium text-lg transform hover:-translate-y-0.5 disabled:transform-none shadow-lg hover:shadow-xl disabled:shadow-none disabled:bg-warm-grey disabled:cursor-not-allowed ${
                hasPreview 
                  ? 'bg-sage text-cream hover:bg-charcoal' 
                  : 'bg-terracotta text-cream hover:bg-charcoal'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Creating your artwork...
                </span>
              ) : hasPreview ? (
                'Create New Preview'
              ) : (
                'Create Preview'
              )}
            </button>
            
            {story.length < 20 && (
              <p className="mt-3 text-sm text-charcoal/60 text-center">
                Please write at least 20 characters to create your preview
              </p>
            )}
          </div>
          
          {currentAttempts > 0 && (
            <div className="text-center">
              <p className="text-charcoal/70 mb-2">
                Like what you see?
              </p>
              <p className="text-sm text-sage">
                Purchase to get HD quality print delivered to your door
              </p>
            </div>
          )}
        </div>
      </div>
      
      {showEmailGate && <EmailGateModal onClose={() => setShowEmailGate(false)} />}
      {showUpgradePrompt && <UpgradePromptModal onClose={() => setShowUpgradePrompt(false)} />}
    </div>
  );
};

interface StyleSelectorProps {
  value: ArtStyle;
  onChange: (style: ArtStyle) => void;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({ value, onChange }) => {
  const styles = [
    { value: ArtStyle.WATERCOLOUR, label: 'Watercolour', description: 'Soft, flowing washes', emoji: '🎨' },
    { value: ArtStyle.OIL_PAINTING, label: 'Oil Painting', description: 'Rich, textured strokes', emoji: '🖼️' },
    { value: ArtStyle.PASTEL, label: 'Pastel', description: 'Chalky, muted tones', emoji: '🌸' },
    { value: ArtStyle.PENCIL_INK, label: 'Pencil & Ink', description: 'Fine line work', emoji: '✏️' },
    { value: ArtStyle.STORYBOOK, label: 'Storybook', description: 'Whimsical illustrations', emoji: '📚' },
    { value: ArtStyle.IMPRESSIONIST, label: 'Impressionist', description: 'Light and movement', emoji: '🌟' },
  ];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {styles.map((style) => (
        <button
          key={style.value}
          onClick={() => onChange(style.value)}
          className={`p-4 border-2 rounded-xl text-left transition-all hover:transform hover:-translate-y-0.5 ${
            value === style.value
              ? 'border-terracotta bg-terracotta/5 shadow-md'
              : 'border-warm-grey/30 hover:border-sage hover:shadow-md'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{style.emoji}</span>
            <div className="font-medium text-charcoal font-serif">{style.label}</div>
          </div>
          <div className="text-xs text-charcoal/60">{style.description}</div>
        </button>
      ))}
    </div>
  );
};

interface AspectSelectorProps {
  value: Aspect;
  onChange: (aspect: Aspect) => void;
}

const AspectSelector: React.FC<AspectSelectorProps> = ({ value, onChange }) => {
  const aspects = [
    { 
      value: "A3_landscape" as Aspect, 
      label: 'A3 Landscape', 
      description: 'Wide format (16.5" × 11.7")', 
      icon: '📐',
      aspect: 'w-8 h-6'
    },
    { 
      value: "A3_portrait" as Aspect, 
      label: 'A3 Portrait', 
      description: 'Tall format (11.7" × 16.5")', 
      icon: '🖼️',
      aspect: 'w-6 h-8'
    },
    { 
      value: "square" as Aspect, 
      label: 'Square', 
      description: 'Equal sides (11.7" × 11.7")', 
      icon: '⬜',
      aspect: 'w-6 h-6'
    },
  ];
  
  return (
    <div className="grid grid-cols-3 gap-3">
      {aspects.map((aspectOption) => (
        <button
          key={aspectOption.value}
          onClick={() => onChange(aspectOption.value)}
          className={`p-4 border-2 rounded-xl text-center transition-all hover:transform hover:-translate-y-0.5 ${
            value === aspectOption.value
              ? 'border-terracotta bg-terracotta/5 shadow-md'
              : 'border-warm-grey/30 hover:border-sage hover:shadow-md'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-xl">{aspectOption.icon}</span>
            <div className={`bg-warm-grey/30 rounded border ${aspectOption.aspect}`}></div>
            <div className="font-medium text-charcoal font-serif text-sm">{aspectOption.label}</div>
            <div className="text-xs text-charcoal/60 leading-tight">{aspectOption.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

const EmailGateModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-slide-up">
        <div className="text-center">
          <div className="w-16 h-16 bg-terracotta/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💌</span>
          </div>
          <h3 className="text-xl font-serif font-semibold text-charcoal mb-3">Get More Free Previews</h3>
          <p className="text-charcoal/70 mb-6">
            Sign up with your email to get 3 more free previews per day and be the first to know about new features!
          </p>
          <div className="space-y-3">
            <button className="w-full px-6 py-3 bg-terracotta text-cream rounded-xl hover:bg-charcoal transition-colors font-medium">
              Sign Up for Free
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-warm-grey/20 text-charcoal rounded-xl hover:bg-warm-grey/30 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const UpgradePromptModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-slide-up">
        <div className="text-center">
          <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⏰</span>
          </div>
          <h3 className="text-xl font-serif font-semibold text-charcoal mb-3">Daily Limit Reached</h3>
          <p className="text-charcoal/70 mb-6">
            You've used all your free previews for today. Come back tomorrow or create your first print now!
          </p>
          <div className="space-y-3">
            <button className="w-full px-6 py-3 bg-sage text-cream rounded-xl hover:bg-charcoal transition-colors font-medium">
              Browse Examples
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-warm-grey/20 text-charcoal rounded-xl hover:bg-warm-grey/30 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};