"use client";

import { useState } from 'react';
import Header from '@/components/navigation/header';

interface FAQItem {
  id: string;
  question: string;
  answer: string | JSX.Element;
  category: string;
}

const faqData: FAQItem[] = [
  // How it Works
  {
    id: 'how-it-works',
    category: 'How It Works',
    question: 'How does TaleToPrint work?',
    answer: `Simply tell us your story in your own words, choose an art style, and our AI creates a beautiful artwork from your memory. You'll see a preview instantly, and if you love it, we'll create a high-resolution version and print it on premium paper for you.`
  },
  {
    id: 'ai-technology',
    category: 'How It Works',
    question: 'What AI technology do you use?',
    answer: `We use advanced AI models including Flux-Schnell and SDXL, optimized specifically for creating beautiful artwork from personal stories. Our AI is trained to understand emotional context and create images that capture the essence of your memories.`
  },
  {
    id: 'story-requirements',
    category: 'How It Works',
    question: 'What makes a good story for TaleToPrint?',
    answer: `The best stories are personal and descriptive. Include details about people, places, emotions, and settings. For example: "My grandmother's garden where we picked strawberries every summer" works better than just "garden". The more vivid your description, the better your artwork will be.`
  },
  {
    id: 'preview-vs-final',
    category: 'How It Works',
    question: 'How is the final print different from the preview?',
    answer: `The preview is a lower resolution version to show you the style and composition. Your final print is generated at 8K resolution (much higher quality) specifically for printing, with enhanced details and print-optimized colors.`
  },

  // Pricing & Sizes
  {
    id: 'pricing',
    category: 'Pricing & Sizes',
    question: 'How much does it cost?',
    answer: (
      <div>
        <p className="mb-2">Our prints are priced as follows:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>A4 (21×30cm):</strong> £39.99</li>
          <li><strong>A3 (30×42cm):</strong> £59.99</li>
        </ul>
        <p className="mt-2">All prices include free UK delivery and are one-time payments with no subscriptions.</p>
      </div>
    )
  },
  {
    id: 'free-previews',
    category: 'Pricing & Sizes',
    question: 'Can I see my artwork before paying?',
    answer: `Yes! You get 3 free previews per day. You can try different stories and styles before deciding to purchase. Only pay when you find an artwork you absolutely love.`
  },
  {
    id: 'size-guidance',
    category: 'Pricing & Sizes',
    question: 'Which size should I choose?',
    answer: `A4 (21×30cm) is perfect for desks, shelves, or smaller wall spaces. A3 (30×42cm) makes a statement piece for living rooms or bedrooms. Both sizes look stunning and the choice depends on where you plan to display your artwork.`
  },

  // Quality & Materials
  {
    id: 'print-quality',
    category: 'Quality & Materials',
    question: 'What paper do you use?',
    answer: `We use premium matte fine art paper (minimum 200gsm) that's FSC certified and archival quality. This ensures your prints won't fade and will look beautiful for decades. The matte finish reduces glare and gives a sophisticated, gallery-like appearance.`
  },
  {
    id: 'resolution',
    category: 'Quality & Materials',
    question: 'What resolution are the final prints?',
    answer: `All final prints are generated at 8K resolution and printed at 300 DPI for crisp, detailed artwork. This is professional gallery-quality resolution that ensures every detail of your story comes through beautifully.`
  },
  {
    id: 'colors',
    category: 'Quality & Materials',
    question: 'Will the colors match what I see on screen?',
    answer: `We optimize all artwork for print using professional color profiles (sRGB). While screen colors can vary, our prints are designed to be vibrant and true to the artistic style you selected. We've calibrated our process for the best possible color reproduction.`
  },
  {
    id: 'framing',
    category: 'Quality & Materials',
    question: 'Do you provide frames?',
    answer: `Currently we supply unframed prints with a subtle white border that's perfect for standard frames. This gives you the flexibility to choose a frame that matches your home décor and personal style.`
  },

  // Delivery & Shipping
  {
    id: 'delivery-time',
    category: 'Delivery & Shipping',
    question: 'How long does delivery take?',
    answer: `Your artwork is printed within 48 hours of approval and delivered within 3-5 business days via Royal Mail. You'll receive tracking information once your order ships.`
  },
  {
    id: 'delivery-cost',
    category: 'Delivery & Shipping',
    question: 'Is delivery free?',
    answer: `Yes! We provide free standard delivery to all UK addresses. Your print will be carefully packaged to arrive in perfect condition.`
  },
  {
    id: 'international',
    category: 'Delivery & Shipping',
    question: 'Do you ship internationally?',
    answer: `Currently we only ship within the UK. We're working on international shipping and will update this page when it becomes available.`
  },
  {
    id: 'packaging',
    category: 'Delivery & Shipping',
    question: 'How is my print packaged?',
    answer: `Your print is carefully packaged in a protective mailer designed specifically for artwork. It's rigid enough to prevent bending and includes moisture protection to ensure your print arrives in perfect condition.`
  },

  // Customization & Styles
  {
    id: 'art-styles',
    category: 'Customization & Styles',
    question: 'What art styles are available?',
    answer: (
      <div>
        <p className="mb-2">We offer six distinctive art styles:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Watercolour:</strong> Soft, flowing washes perfect for gentle memories</li>
          <li><strong>Oil Painting:</strong> Rich, textured strokes with classical elegance</li>
          <li><strong>Pastel:</strong> Chalky, muted tones with dreamy atmosphere</li>
          <li><strong>Pencil & Ink:</strong> Fine line work with detailed precision</li>
          <li><strong>Storybook:</strong> Whimsical illustrations with narrative charm</li>
          <li><strong>Impressionist:</strong> Light and movement in classic artistic style</li>
        </ul>
      </div>
    )
  },
  {
    id: 'revisions',
    category: 'Customization & Styles',
    question: 'Can I request changes to my artwork?',
    answer: `Each artwork is uniquely generated from your story. If you'd like different results, you can create new previews with adjusted stories or try different art styles. We recommend being as descriptive as possible in your initial story for the best results.`
  },
  {
    id: 'multiple-stories',
    category: 'Customization & Styles',
    question: 'Can I order multiple prints?',
    answer: `Absolutely! Each story creates a unique artwork, so you can order as many different prints as you'd like. Many customers create a series of family memories or different views of the same special place.`
  },

  // Returns & Refunds
  {
    id: 'satisfaction-guarantee',
    category: 'Returns & Refunds',
    question: 'What if I\'m not happy with my print?',
    answer: `We offer a 100% satisfaction guarantee. If you're not completely happy with your print quality (not the artistic interpretation), contact us within 14 days and we'll make it right with a reprint or full refund.`
  },
  {
    id: 'refund-policy',
    category: 'Returns & Refunds',
    question: 'What\'s your refund policy?',
    answer: `You can request a full refund within 14 days if there are quality issues with printing. Since each artwork is custom-generated, we can't offer refunds based on artistic interpretation, but we encourage using the free preview system to ensure you love your artwork before purchasing.`
  },
  {
    id: 'damaged-delivery',
    category: 'Returns & Refunds',
    question: 'What if my print arrives damaged?',
    answer: `If your print arrives damaged, contact us immediately with photos and we'll send a replacement at no charge. We stand behind our packaging and shipping process.`
  },

  // Technical & Privacy
  {
    id: 'data-privacy',
    category: 'Technical & Privacy',
    question: 'What happens to my stories and images?',
    answer: `Your stories are used solely to generate your artwork and are not stored permanently or used for any other purpose. Generated images are stored temporarily for order fulfillment and then deleted. We take your privacy seriously and never share your personal stories.`
  },
  {
    id: 'payment-security',
    category: 'Technical & Privacy',
    question: 'Is my payment information secure?',
    answer: `Yes! All payments are processed through Stripe, which is bank-level secure and PCI compliant. We never store your payment information on our servers.`
  },
  {
    id: 'account-required',
    category: 'Technical & Privacy',
    question: 'Do I need to create an account?',
    answer: `No account required! You can create and purchase prints without signing up. We only need your email for order updates and delivery confirmation.`
  },

  // Customer Service
  {
    id: 'contact-support',
    category: 'Customer Service',
    question: 'How can I contact customer support?',
    answer: `You can reach us at hello@taletoprint.com. We aim to respond to all inquiries within 24 hours. For urgent delivery questions, please include your order number.`
  },
  {
    id: 'order-tracking',
    category: 'Customer Service',
    question: 'How can I track my order?',
    answer: `You'll receive an email with tracking information once your print ships. You can use this to follow your package's journey via Royal Mail's tracking system.`
  },
  {
    id: 'rush-orders',
    category: 'Customer Service',
    question: 'Do you offer rush delivery?',
    answer: `Currently we offer standard 3-5 day delivery. If you have an urgent need, contact us at hello@taletoprint.com and we'll do our best to accommodate special requests.`
  }
];

const categories = [...new Set(faqData.map(item => item.category))];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('How It Works');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const filteredFAQ = faqData.filter(item => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-cream">
      <Header variant="minimal" />
      
      {/* Hero Section */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-serif font-semibold text-charcoal mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-charcoal/80 max-w-2xl mx-auto">
            Everything you need to know about turning your stories into beautiful art prints
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Category Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-warm-grey/10 p-6 sticky top-8">
                <h3 className="font-serif font-semibold text-charcoal mb-4">Categories</h3>
                <nav className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                        activeCategory === category
                          ? 'bg-terracotta text-cream'
                          : 'text-charcoal hover:bg-cream/50'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* FAQ Items */}
            <div className="lg:col-span-3">
              <div className="space-y-4">
                {filteredFAQ.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl shadow-lg border border-warm-grey/10 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-cream/30 transition-colors"
                    >
                      <h3 className="font-serif font-semibold text-charcoal pr-4">
                        {item.question}
                      </h3>
                      <div className={`transform transition-transform flex-shrink-0 ${
                        openItems.has(item.id) ? 'rotate-180' : ''
                      }`}>
                        <svg className="w-5 h-5 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    
                    {openItems.has(item.id) && (
                      <div className="px-6 pb-4">
                        <div className="text-charcoal/80 leading-relaxed">
                          {typeof item.answer === 'string' ? (
                            <p>{item.answer}</p>
                          ) : (
                            item.answer
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Still Have Questions CTA */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-warm-grey/10 p-8 text-center">
            <h2 className="text-2xl font-serif font-semibold text-charcoal mb-4">
              Still have questions?
            </h2>
            <p className="text-charcoal/80 mb-6">
              We're here to help! Get in touch and we'll respond within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:hello@taletoprint.com"
                className="inline-flex items-center px-6 py-3 bg-terracotta text-cream rounded-xl hover:bg-charcoal transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Support
              </a>
              <a
                href="/"
                className="inline-flex items-center px-6 py-3 bg-sage text-cream rounded-xl hover:bg-charcoal transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Try TaleToPrint
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}