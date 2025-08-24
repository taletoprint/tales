import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personalised Art Prints from Your Stories | Custom Gift Prints UK - TaleToPrint",
  description: "Transform your cherished memories into beautiful personalised art prints. Choose from watercolour, oil painting, pastel & more. Perfect unique gifts. UK printed, worldwide shipping. Order today!",
  keywords: [
    "personalised art print",
    "custom story artwork", 
    "memory to wall art",
    "bespoke gift prints",
    "watercolour family portrait",
    "custom art gifts UK",
    "unique gift ideas",
    "illustrated family memory",
    "turn story into art",
    "personalised wall art",
    "custom memory prints",
    "AI art from text"
  ],
  authors: [{ name: "TaleToPrint" }],
  openGraph: {
    title: "Personalised Art Prints from Your Stories | TaleToPrint",
    description: "Transform memories into beautiful custom artwork. Watercolour, oil painting, pastel styles. Perfect unique gifts. UK printed in 48 hours.",
    url: "https://taletoprint.com",
    siteName: "TaleToPrint",
    images: [
      {
        url: "https://taletoprint.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "TaleToPrint - Custom Art Prints from Your Stories",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Personalised Art Prints from Your Stories | TaleToPrint",
    description: "Transform memories into beautiful custom artwork. Perfect unique gifts. UK printed.",
    images: ["https://taletoprint.com/og-image.jpg"],
  },
  alternates: {
    canonical: "https://taletoprint.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body 
        className="font-sans antialiased"
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
