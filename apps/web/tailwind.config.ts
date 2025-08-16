import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        charcoal: '#333333',
        cream: '#F9F7F1',
        terracotta: '#E15935',
        sage: '#7F9A88',
        'warm-grey': '#B7B7B7',
        
        // Override defaults for brand consistency
        background: '#F9F7F1',
        foreground: '#333333',
      },
      fontFamily: {
        // Serif for headings - using system fonts as fallback
        serif: ['EB Garamond', 'Libre Baskerville', 'Georgia', 'Times New Roman', 'serif'],
        // Sans for body
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Base sizes for mobile-first
        'base-mobile': '16px',
        'base-desktop': '18px',
      },
      animation: {
        'fade-in': 'fadeIn 250ms ease-out',
        'slide-up': 'slideUp 300ms ease-out',
        'slide-down': 'slideDown 300ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      screens: {
        // Custom breakpoint for desktop layout
        'desktop': '768px',
      },
    },
  },
  plugins: [],
};

export default config;