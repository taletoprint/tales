import Script from 'next/script';

export function SchemaMarkup() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "TaleToPrint",
    "url": "https://taletoprint.com",
    "logo": "https://taletoprint.com/logo.png",
    "description": "Transform your cherished memories into beautiful personalised art prints. Custom artwork from your stories.",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "GB"
    },
    "sameAs": [
      "https://twitter.com/taletoprint",
      "https://instagram.com/taletoprint"
    ]
  };

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Personalised Art Print",
    "description": "Custom art prints created from your personal stories and memories. Available in multiple styles including watercolour, oil painting, pastel, and storybook illustrations.",
    "brand": {
      "@type": "Brand",
      "name": "TaleToPrint"
    },
    "category": "Art Prints",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "GBP",
      "lowPrice": "15",
      "highPrice": "45",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "TaleToPrint"
      }
    },
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "Art Style",
        "value": "Watercolour, Oil Painting, Pastel, Impressionist, Storybook, Pencil & Ink"
      },
      {
        "@type": "PropertyValue", 
        "name": "Print Size",
        "value": "A4, A3"
      },
      {
        "@type": "PropertyValue",
        "name": "Shipping",
        "value": "UK Printed, Worldwide Shipping"
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does TaleToPrint work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Simply share your story, choose your preferred art style (watercolour, oil painting, pastel, etc.), and we'll transform it into a beautiful personalised art print. Your custom artwork is printed in the UK and shipped worldwide within 48 hours."
        }
      },
      {
        "@type": "Question",
        "name": "What art styles are available?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We offer watercolour prints, oil painting prints, pastel artwork, impressionist paintings, storybook illustrations, and pencil & ink sketches. Each style is perfect for different types of memories and gift occasions."
        }
      },
      {
        "@type": "Question",
        "name": "What makes a good personalised gift print?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The best custom art prints come from meaningful personal stories - family memories, special moments, romantic occasions, or childhood tales. Our watercolour and storybook styles are particularly popular for unique gifts."
        }
      }
    ]
  };

  return (
    <>
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Script
        id="product-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}