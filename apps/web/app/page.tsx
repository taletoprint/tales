"use client";

import { useState, useRef, useEffect } from 'react';
import { StoryInput } from '@/components/generation/story-input';
import { PreviewDisplay } from '@/components/generation/preview-display';
import { PreviewResult } from '@/lib/types';

export default function Home() {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const previewSectionRef = useRef<HTMLDivElement>(null);
  const [showCancelMessage, setShowCancelMessage] = useState(false);
  
  const handlePreview = (newPreview: PreviewResult) => {
    setPreview(newPreview);
    setAttemptCount(prev => prev + 1);
  };

  // Auto-scroll to preview when it's created
  useEffect(() => {
    if (preview && previewSectionRef.current) {
      // Small delay to ensure the preview is rendered
      setTimeout(() => {
        previewSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [preview]);

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
    console.log('Starting checkout for preview:', preview?.id);
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
              <h1 className="text-2xl font-serif font-semibold text-charcoal">
                TaleToPrint
              </h1>
            </div>
            <div className="hidden desktop:flex items-center space-x-6">
              <a href="#how-it-works" className="text-sage hover:text-terracotta transition-colors">
                How it works
              </a>
              <a href="#examples" className="text-sage hover:text-terracotta transition-colors">
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

      {/* Hero Section */}
      <section className="pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-semibold text-charcoal mb-6 leading-tight">
            Turn your story into 
            <span className="text-terracotta"> beautiful art</span>
          </h2>
          <p className="text-lg sm:text-xl text-charcoal/80 mb-8 max-w-2xl mx-auto">
            Transform your most treasured memories into stunning, high-quality prints. 
            Perfect for your home or as thoughtful gifts.
          </p>
          
          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center items-center gap-6 mb-12 text-sm text-sage">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Printed in the UK within 48 hours
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Secure checkout
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Money-back guarantee
            </div>
          </div>

          <a
            href="#create"
            className="inline-flex items-center px-8 py-4 text-lg font-medium text-cream bg-terracotta rounded-lg hover:bg-charcoal transform hover:-translate-y-1 transition-all duration-250 shadow-lg hover:shadow-xl"
          >
            Create your print
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-serif font-semibold text-charcoal mb-4">
              How it works
            </h3>
            <p className="text-lg text-charcoal/80 max-w-2xl mx-auto">
              Three simple steps to transform your memory into art
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: "1",
                title: "Tell your story",
                description: "Share a special memory in just a few sentences. Our AI understands the emotion behind your words.",
                icon: "✍️"
              },
              {
                step: "2", 
                title: "Choose your style",
                description: "Select from watercolor, vintage poster, or line art styles to match your taste and décor.",
                icon: "🎨"
              },
              {
                step: "3",
                title: "Receive your print",
                description: "We'll create your artwork and deliver a premium A3 print to your door within 48 hours.",
                icon: "📦"
              }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-terracotta/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <div className="w-8 h-8 bg-terracotta text-cream rounded-full flex items-center justify-center mx-auto mb-4 font-semibold">
                  {item.step}
                </div>
                <h4 className="text-xl font-serif font-semibold text-charcoal mb-3">
                  {item.title}
                </h4>
                <p className="text-charcoal/70">
                  {item.description}
                </p>
              </div>
            ))}
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
            hasPreview={!!preview}
          />
          
          {preview && (
            <div ref={previewSectionRef} className="mt-16 animate-fade-in">
              <PreviewDisplay 
                preview={preview}
                onSelectForPurchase={handleSelectForPurchase}
              />
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