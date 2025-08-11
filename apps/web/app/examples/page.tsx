"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Example {
  id: number;
  style: string;
  prompt: string;
  previewUrl: string; // Placeholder for now
  mockupUrl: string; // Placeholder for now
}

const examples: Example[] = [
  // Watercolour
  {
    id: 1,
    style: "Watercolour",
    prompt: "One summer evening, I walked barefoot along the beach with my daughter, collecting seashells as the waves lapped at our feet and the sky turned shades of pink and gold.",
    previewUrl: "/images/examples/watercolour01_Soft_dreamy_watercolour_painting_of_a_barefoot_6d899b94-39dc-456b-b311-0ec112d94f9f.png", 
    mockupUrl: "/api/placeholder/600/800"
  },
  {
    id: 2,
    style: "Watercolour", 
    prompt: "On a rainy afternoon, I sat at the café window with a steaming cup of tea, watching raindrops race down the glass as people hurried past under colourful umbrellas.",
    previewUrl: "/images/examples/watercolour02_Cosy_watercolour_scene_of_a_rainy_afternoon_vi_6f86d19c-4fa2-4093-b8a6-4efbf6d0aec6.png",
    mockupUrl: "/api/placeholder/600/800"
  },
  
  // Oil Painting
  {
    id: 3,
    style: "Oil Painting",
    prompt: "The family gathered in the old farmhouse kitchen, lit by the warm glow of a single lamp, as my grandfather carved the roast and everyone laughed over shared stories.",
    previewUrl: "/images/examples/Oil01_Rich_detailed_oil_painting_of_a_warm_farmhou_9f2311bc-d0d8-45f4-b2f3-67c48046f78f_0.png",
    mockupUrl: "/api/placeholder/600/800"
  },
  {
    id: 4,
    style: "Oil Painting",
    prompt: "In the heart of autumn, we hiked through the forest where every tree was aflame with red and orange leaves, and the air smelled of woodsmoke and earth.",
    previewUrl: "/images/examples/Oil02_Vivid_oil_painting_of_an_autumn_forest_trees_19a49a27-1c1c-4690-9082-64240b3388dd_0.png", 
    mockupUrl: "/api/placeholder/600/800"
  },
  
  // Pastel Illustration
  {
    id: 5,
    style: "Pastel Illustration",
    prompt: "On the first day of spring, my garden burst into life — tulips, daffodils, and blossom trees swaying gently in the breeze as the sun warmed my face.",
    previewUrl: "/images/examples/chalk01_Charming_pastel_illustration_of_a_blooming_s_4fa50ac1-ac81-40d6-8ad1-7bc1eac12c23_0.png",
    mockupUrl: "/api/placeholder/600/800"
  },
  {
    id: 6,
    style: "Pastel Illustration",
    prompt: "My little terrier curled up on the armchair by the fire, her paws twitching as she dreamed, the soft crackle of logs filling the quiet room.",
    previewUrl: "/images/examples/chalk02_Chalky_pastel_illustration_of_a_small_terrie_ce6b1897-7f29-4386-907d-74730a396cb5_0.png",
    mockupUrl: "/api/placeholder/600/800"
  },
  
  // Pencil & Ink Sketch
  {
    id: 7,
    style: "Pencil & Ink Sketch",
    prompt: "We strolled through the cobbled streets of a small Italian village, stopping to admire ivy-covered walls and tiny balconies overflowing with flowers.",
    previewUrl: "/images/examples/pen01_Elegant_pencil_and_ink_sketch_of_a_cobbled_I_1183204d-752a-4de5-969f-882b18ba82bc_2.png",
    mockupUrl: "/api/placeholder/600/800"
  },
  {
    id: 8,
    style: "Pencil & Ink Sketch", 
    prompt: "Standing at the harbour at dawn, I sketched the fishing boats rocking gently in the tide, their masts silhouetted against the pale morning sky.",
    previewUrl: "/images/examples/pen02_Detailed_pencil_and_ink_sketch_of_a_quiet_ha_9b29e125-02ff-4779-a82a-e9997f1d25ef_0.png",
    mockupUrl: "/api/placeholder/600/800"
  },
  
  // Storybook
  {
    id: 9,
    style: "Storybook",
    prompt: "My son's first steps across the living room, reaching out with a huge smile as the morning light poured through the window behind him.",
    previewUrl: "/images/examples/storybook01_Whimsical_storybook_illustration_of_a_babys__dfe69dd9-14b0-440b-8a32-aebf58192c76_1.png",
    mockupUrl: "/api/placeholder/600/800"
  },
  {
    id: 10,
    style: "Storybook",
    prompt: "In winter's quiet, I built a snowman with my niece, wrapping a bright red scarf around his neck as snowflakes drifted gently from the sky.",
    previewUrl: "/images/examples/Storybook02_Magical_storybook_illustration_of_a_snowy_wi_ebebaf54-0d72-4c92-b74a-afbbc3ac92e2_1.png",
    mockupUrl: "/api/placeholder/600/800"
  },
  
  // Impressionist
  {
    id: 11,
    style: "Impressionist",
    prompt: "At the summer fair, children twirled on the carousel under strings of glowing lights, the air filled with music and the scent of candy floss.",
    previewUrl: "/images/examples/Impressionist01_Bright_impressionist_painting_of_a_summer_fa_7185ebc4-3b35-462b-ab7b-2f1be8ef2bca_1.png",
    mockupUrl: "/api/placeholder/600/800"
  },
  {
    id: 12,
    style: "Impressionist",
    prompt: "A couple danced barefoot in the meadow at sunset, the grass dotted with wildflowers and the horizon melting into shades of lavender and gold.",
    previewUrl: "/images/examples/impressionist02_Romantic_impressionist_painting_of_a_couple__bfe300f4-750c-4480-b6e7-a3c30d403885_2.png",
    mockupUrl: "/api/placeholder/600/800"
  }
];

const styles = ["All", "Watercolour", "Oil Painting", "Pastel Illustration", "Pencil & Ink Sketch", "Storybook", "Impressionist"];

export default function ExamplesPage() {
  const [selectedStyle, setSelectedStyle] = useState("All");
  const [selectedExample, setSelectedExample] = useState<Example | null>(null);

  const filteredExamples = selectedStyle === "All" 
    ? examples 
    : examples.filter(example => example.style === selectedStyle);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-warm-grey/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <Image 
                src="/images/logo/ttp_logo.png" 
                alt="TaleToPrint"
                width={128}
                height={64}
                className="h-16 w-auto"
                priority
              />
            </Link>
            <Link 
              href="/#create"
              className="px-6 py-2 bg-terracotta text-cream rounded-lg hover:bg-charcoal transition-colors font-medium"
            >
              Create yours
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-serif font-semibold text-charcoal mb-6">
            Story inspiration & 
            <span className="text-terracotta"> art styles</span>
          </h2>
          <p className="text-lg text-charcoal/80 mb-8 max-w-2xl mx-auto">
            Discover how different art styles can bring your memories to life. 
            Each example shows a real story transformed into beautiful artwork.
          </p>
        </div>
      </section>

      {/* Style Filter */}
      <section className="pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {styles.map((style) => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedStyle === style
                    ? 'bg-terracotta text-cream shadow-md'
                    : 'bg-white text-charcoal hover:bg-sage/10 border border-warm-grey/30'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Examples Grid */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {filteredExamples.map((example) => (
              <div 
                key={example.id} 
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-8">
                  {/* Style Badge */}
                  <div className="inline-block px-3 py-1 bg-sage/10 text-sage text-sm font-medium rounded-full mb-4">
                    {example.style}
                  </div>
                  
                  {/* Story Prompt */}
                  <div className="mb-6">
                    <h3 className="font-serif font-semibold text-lg text-charcoal mb-3">
                      The Story
                    </h3>
                    <blockquote className="text-charcoal/80 italic border-l-4 border-terracotta/30 pl-4">
                      "{example.prompt}"
                    </blockquote>
                  </div>
                  
                  {/* Preview and Mockup */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* AI Generated Preview */}
                    <div>
                      <h4 className="font-medium text-charcoal mb-3">AI Generated Art</h4>
                      <div className="aspect-square bg-warm-grey/20 rounded-lg overflow-hidden">
                        <Image 
                          src={example.previewUrl}
                          alt={`${example.style} preview`}
                          width={512}
                          height={512}
                          className="w-full h-full object-cover"
                          priority={example.id <= 4} // Prioritize first 4 images
                        />
                      </div>
                    </div>
                    
                    {/* Real World Mockup */}
                    <div>
                      <h4 className="font-medium text-charcoal mb-3">In Your Home</h4>
                      <div className="aspect-square bg-warm-grey/20 rounded-lg overflow-hidden">
                        <Image 
                          src={example.mockupUrl}
                          alt={`${example.style} mockup`}
                          width={512}
                          height={512}
                          className="w-full h-full object-cover"
                          priority={example.id <= 4} // Prioritize first 4 images
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="mt-6 pt-6 border-t border-warm-grey/20">
                    <button
                      onClick={() => setSelectedExample(example)}
                      className="w-full px-4 py-3 bg-terracotta/10 text-terracotta rounded-lg hover:bg-terracotta hover:text-cream transition-colors font-medium"
                    >
                      Use this as inspiration
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal for Selected Example */}
      {selectedExample && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-serif font-semibold text-charcoal">
                  Inspiration: {selectedExample.style}
                </h3>
                <button
                  onClick={() => setSelectedExample(null)}
                  className="text-charcoal/50 hover:text-charcoal text-2xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6">
                <blockquote className="text-charcoal/80 italic border-l-4 border-terracotta/30 pl-4 mb-4">
                  "{selectedExample.prompt}"
                </blockquote>
                <p className="text-sm text-charcoal/70 mb-4">
                  This story was transformed into beautiful {selectedExample.style.toLowerCase()} artwork. 
                  You can use this as inspiration for your own story, or create something completely unique.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Link 
                  href="/#create"
                  className="flex-1 px-6 py-3 bg-terracotta text-cream rounded-lg hover:bg-charcoal transition-colors font-medium text-center"
                  onClick={() => setSelectedExample(null)}
                >
                  Create your own story
                </Link>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedExample.prompt);
                    // Could add a toast notification here
                  }}
                  className="px-6 py-3 bg-sage/10 text-sage rounded-lg hover:bg-sage/20 transition-colors font-medium"
                >
                  Copy story
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-charcoal">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-serif font-semibold text-cream mb-4">
            Ready to create your own?
          </h3>
          <p className="text-lg text-cream/80 mb-8 max-w-2xl mx-auto">
            Transform your treasured memory into beautiful artwork in just a few minutes. 
            Choose your style and watch your story come to life.
          </p>
          <Link
            href="/#create"
            className="inline-flex items-center px-8 py-4 text-lg font-medium text-charcoal bg-cream rounded-xl hover:bg-sage transform hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Start creating your artwork
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal text-cream border-t border-cream/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <Link href="/">
                <h4 className="text-xl font-serif font-semibold mb-4">TaleToPrint</h4>
              </Link>
              <p className="text-cream/80 mb-6">
                Transforming your most treasured stories into beautiful art prints.
              </p>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Explore</h5>
              <ul className="space-y-2 text-sm text-cream/80">
                <li><Link href="/" className="hover:text-cream transition-colors">Home</Link></li>
                <li><Link href="/examples" className="hover:text-cream transition-colors">Examples</Link></li>
                <li><Link href="/#create" className="hover:text-cream transition-colors">Create</Link></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Support</h5>
              <ul className="space-y-2 text-sm text-cream/80">
                <li><a href="#" className="hover:text-cream transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-cream transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-cream transition-colors">Returns</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-cream/20 mt-8 pt-8 text-center text-sm text-cream/60">
            © 2024 TaleToPrint Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}