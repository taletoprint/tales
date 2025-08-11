"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { StoryInput } from '@/components/generation/story-input';
import { PreviewDisplay } from '@/components/generation/preview-display';
import { PreviewResult } from '@/lib/types';

export default function Home() {
  const [selectedPreview, setSelectedPreview] = useState<PreviewResult | null>(null);
  const [allPreviews, setAllPreviews] = useState<PreviewResult[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const previewSectionRef = useRef<HTMLDivElement>(null);
  const [showCancelMessage, setShowCancelMessage] = useState(false);
  
  // Load saved previews and daily attempt count on mount
  useEffect(() => {
    const today = new Date().toDateString();
    
    // Load previews
    const savedPreviews = localStorage.getItem('taletoprint_previews');
    if (savedPreviews) {
      try {
        const parsed = JSON.parse(savedPreviews);
        setAllPreviews(parsed);
        if (parsed.length > 0) {
          setSelectedPreview(parsed[parsed.length - 1]); // Select most recent
        }
      } catch (e) {
        console.error('Failed to load saved previews:', e);
      }
    }
    
    // Load daily attempt count (separate from previews)
    const savedAttempts = localStorage.getItem('taletoprint_daily_attempts');
    if (savedAttempts) {
      try {
        const { date, count } = JSON.parse(savedAttempts);
        if (date === today) {
          setAttemptCount(count);
        } else {
          // New day - reset counter
          setAttemptCount(0);
          localStorage.setItem('taletoprint_daily_attempts', JSON.stringify({ date: today, count: 0 }));
        }
      } catch (e) {
        console.error('Failed to load daily attempts:', e);
        setAttemptCount(0);
      }
    } else {
      // First time - initialize
      localStorage.setItem('taletoprint_daily_attempts', JSON.stringify({ date: today, count: 0 }));
    }
  }, []);
  
  // Save previews to localStorage whenever they change
  useEffect(() => {
    if (allPreviews.length > 0) {
      localStorage.setItem('taletoprint_previews', JSON.stringify(allPreviews));
    }
  }, [allPreviews]);
  
  const handlePreview = (newPreview: PreviewResult) => {
    setSelectedPreview(newPreview);
    setAllPreviews(prev => [...prev, newPreview]);
    
    // Increment daily attempt counter
    const newCount = attemptCount + 1;
    setAttemptCount(newCount);
    
    // Save daily attempts to localStorage
    const today = new Date().toDateString();
    localStorage.setItem('taletoprint_daily_attempts', JSON.stringify({ date: today, count: newCount }));
  };

  // Auto-scroll to preview when it's created
  useEffect(() => {
    if (selectedPreview && previewSectionRef.current) {
      // Small delay to ensure the preview is rendered
      setTimeout(() => {
        previewSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [selectedPreview]);

  // Check for checkout cancellation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('cancelled')) {
      setShowCancelMessage(true);
      // Clear the cancelled param from URL
      window.history.replaceState({}, '', window.location.pathname);
      // Hide message after 5 seconds
      setTimeout(() => setShowCancelMessage(false), 5000);
    }
  }, []);
  
  const handleSelectForPurchase = () => {
    // TODO: Implement checkout flow
    console.log('Starting checkout for preview:', selectedPreview?.id);
  };
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Sticky Header */}
      {/* Cancel Message Toast */}
      {showCancelMessage && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-warm-grey/20 rounded-xl shadow-lg p-4 max-w-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">💭</span>
            <div>
              <p className="font-medium text-charcoal">Checkout cancelled</p>
              <p className="text-sm text-charcoal/70">No worries! Your preview is still here when you're ready.</p>
            </div>
            <button
              onClick={() => setShowCancelMessage(false)}
              className="text-charcoal/50 hover:text-charcoal ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-warm-grey/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Image 
                src="/images/logo/ttp_logo.png" 
                alt="TaleToPrint"
                width={128}
                height={64}
                className="h-12 w-auto py-2"
                priority
              />
            </div>
            <div className="hidden desktop:flex items-center space-x-6">
              <a href="#how-it-works" className="text-sage hover:text-terracotta transition-colors">
                How it works
              </a>
              <a href="/examples" className="text-sage hover:text-terracotta transition-colors">
                Examples
              </a>
            </div>
            {/* Mobile menu button */}
            <button className="desktop:hidden p-2">
              <svg className="w-6 h-6 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Integrated How It Works */}
      <section className="pt-8 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-cream to-white">
        <div className="max-w-5xl mx-auto">
          {/* Main Hero Content */}
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-semibold text-charcoal mb-4 leading-tight">
              Turn your story into 
              <span className="text-terracotta"> beautiful art</span>
            </h2>
            <p className="text-lg sm:text-xl text-charcoal/80 mb-8 max-w-2xl mx-auto">
              Transform your treasured memories into stunning prints in just 3 steps
            </p>
          </div>

          {/* Compact How It Works Flow */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              {[
                { icon: "✍️", title: "Tell your story", desc: "Share your memory" },
                { icon: "🎨", title: "AI creates art", desc: "Choose your style" }, 
                { icon: "📦", title: "Premium print", desc: "Delivered in 48h" }
              ].map((step, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-terracotta/10 rounded-full flex items-center justify-center mb-3">
                    <span className="text-xl">{step.icon}</span>
                  </div>
                  <h4 className="font-serif font-semibold text-charcoal mb-1">{step.title}</h4>
                  <p className="text-sm text-charcoal/70">{step.desc}</p>
                  {index < 2 && (
                    <div className="hidden md:block absolute transform translate-x-12 mt-6">
                      <svg className="w-6 h-6 text-sage" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Trust indicators & CTA */}
          <div className="text-center">
            <div className="flex flex-wrap justify-center items-center gap-4 mb-6 text-sm text-sage">
              <span className="flex items-center gap-1">🇬🇧 UK printed</span>
              <span className="flex items-center gap-1">🔒 Secure checkout</span>
              <span className="flex items-center gap-1">✅ Money-back guarantee</span>
            </div>

            <a
              href="#create"
              className="inline-flex items-center px-8 py-4 text-lg font-medium text-cream bg-terracotta rounded-xl hover:bg-charcoal transform hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Start creating your artwork
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Main Form Section */}
      <section id="create" className="py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl sm:text-4xl font-serif font-semibold text-charcoal mb-4">
              Create your artwork
            </h3>
            <p className="text-lg text-charcoal/80">
              Tell us your story and watch it come to life
            </p>
          </div>
          
          <StoryInput 
            onPreview={handlePreview}
            currentAttempts={attemptCount}
            hasPreview={!!selectedPreview}
          />
          
          {allPreviews.length > 0 && (
            <div ref={previewSectionRef} className="mt-16 animate-fade-in">
              {/* Selected Preview Display */}
              {selectedPreview && (
                <PreviewDisplay 
                  preview={selectedPreview}
                  onSelectForPurchase={handleSelectForPurchase}
                />
              )}
              
              {/* Preview Gallery - Below the main preview */}
              {allPreviews.length > 1 && (
                <div className="mt-12 pt-12 border-t border-warm-grey/20">
                  <h4 className="text-lg font-serif font-semibold text-charcoal mb-4">Other versions you've created</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {allPreviews.map((preview, index) => (
                      <div 
                        key={preview.id} 
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          selectedPreview?.id === preview.id 
                            ? 'border-terracotta ring-2 ring-terracotta ring-offset-2' 
                            : 'border-transparent hover:border-warm-grey/30'
                        }`}
                        onClick={() => setSelectedPreview(preview)}
                      >
                        <div className="aspect-square">
                          <img 
                            src={preview.imageUrl} 
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {selectedPreview?.id === preview.id && (
                          <div className="absolute top-1 right-1 bg-terracotta text-cream rounded-full p-0.5">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => {
                      setAllPreviews([]);
                      setSelectedPreview(null);
                      localStorage.removeItem('taletoprint_previews');
                      // Note: We DON'T reset attemptCount - daily limit persists
                    }}
                    className="mt-4 text-sm text-charcoal/60 hover:text-charcoal transition-colors"
                  >
                    Clear all previews
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal text-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h4 className="text-xl font-serif font-semibold mb-4">TaleToPrint</h4>
              <p className="text-cream/80 mb-6">
                Transforming your most treasured stories into beautiful art prints.
              </p>
              <div className="flex items-center gap-4">
                {/* Trust badges */}
                <div className="text-xs text-cream/60">
                  <div>🇬🇧 Printed in UK</div>
                  <div>🌱 FSC Certified</div>
                </div>
                <div className="text-xs text-cream/60">
                  <div>🔒 Secure SSL</div>
                  <div>📞 UK Support</div>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Company</h5>
              <ul className="space-y-2 text-sm text-cream/80">
                <li><a href="#" className="hover:text-cream transition-colors">About us</a></li>
                <li><a href="#" className="hover:text-cream transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-cream transition-colors">Reviews</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Legal</h5>
              <ul className="space-y-2 text-sm text-cream/80">
                <li><a href="#" className="hover:text-cream transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-cream transition-colors">Terms & Conditions</a></li>
                <li><a href="#" className="hover:text-cream transition-colors">Refund Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-cream/20 mt-8 pt-8 text-center text-sm text-cream/60">
            © 2024 TaleToPrint Ltd. Company number: 12345678. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}