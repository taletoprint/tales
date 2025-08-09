import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaleToPrint - Transform Your Stories Into Beautiful Art",
  description: "Turn your most treasured memories into stunning, high-quality art prints. Perfect for your home or as thoughtful gifts. Printed in the UK within 48 hours.",
  keywords: ["art prints", "custom art", "story to art", "personalized gifts", "memory prints", "AI art"],
  authors: [{ name: "TaleToPrint" }],
  openGraph: {
    title: "TaleToPrint - Transform Your Stories Into Beautiful Art",
    description: "Turn your most treasured memories into stunning, high-quality art prints.",
    url: "https://taletoprint.com",
    siteName: "TaleToPrint",
    locale: "en_GB",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
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
