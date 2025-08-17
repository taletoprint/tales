"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  description?: string;
  isExternal?: boolean;
}

const mainNavItems: NavItem[] = [
  {
    href: '/',
    label: 'Home',
    icon: '🏠',
    description: 'Create your artwork'
  },
  {
    href: '/examples', 
    label: 'Examples',
    icon: '🎨',
    description: 'See art styles & inspiration'
  },
  {
    href: '/faq',
    label: 'FAQ',
    icon: '❓',
    description: 'Answers to common questions'
  }
];

const quickActions: NavItem[] = [
  {
    href: '/#create',
    label: 'Start Creating',
    icon: '✨',
    description: 'Turn your story into art'
  }
];

const supportItems: NavItem[] = [
  {
    href: 'mailto:hello@taletoprint.com',
    label: 'Contact Support',
    icon: '💬',
    isExternal: true
  },
  {
    href: '/admin',
    label: 'Admin',
    icon: '⚙️'
  }
];

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const MenuItem = ({ item, index }: { item: NavItem; index: number }) => {
    const isActive = pathname === item.href;
    const linkClass = `
      flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 
      ${isActive 
        ? 'bg-terracotta text-cream shadow-lg' 
        : 'bg-white/50 text-charcoal hover:bg-white hover:shadow-md hover:-translate-y-1'
      }
    `;

    const content = (
      <div className={linkClass}>
        <div className="text-2xl">{item.icon}</div>
        <div className="flex-1">
          <div className="font-medium">{item.label}</div>
          {item.description && (
            <div className={`text-sm ${isActive ? 'text-cream/80' : 'text-charcoal/60'}`}>
              {item.description}
            </div>
          )}
        </div>
        {!isActive && (
          <svg 
            className="w-5 h-5 text-charcoal/40" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    );

    if (item.isExternal) {
      return (
        <a 
          href={item.href}
          className="block"
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={onClose}
        >
          {content}
        </a>
      );
    }

    return (
      <Link 
        href={item.href}
        className="block animate-slide-up"
        style={{ animationDelay: `${index * 50}ms` }}
        onClick={onClose}
      >
        {content}
      </Link>
    );
  };

  return (
    <div className="fixed inset-0 z-50 desktop:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-charcoal/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-br from-cream via-white to-cream/80 shadow-2xl animate-slide-down">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-warm-grey/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <h3 className="font-serif font-semibold text-charcoal">TaleToPrint</h3>
              <p className="text-sm text-charcoal/60">Story to Art</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/50 text-charcoal hover:bg-white hover:text-terracotta transition-all duration-200"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto">
          {/* Main Navigation */}
          <div>
            <h4 className="text-sm font-medium text-charcoal/60 uppercase tracking-wide mb-3">
              Navigate
            </h4>
            <div className="space-y-3">
              {mainNavItems.map((item, index) => (
                <MenuItem key={item.href} item={item} index={index} />
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h4 className="text-sm font-medium text-charcoal/60 uppercase tracking-wide mb-3">
              Quick Actions
            </h4>
            <div className="space-y-3">
              {quickActions.map((item, index) => (
                <MenuItem key={item.href} item={item} index={index + mainNavItems.length} />
              ))}
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-medium text-charcoal/60 uppercase tracking-wide mb-3">
              Support
            </h4>
            <div className="space-y-3">
              {supportItems.map((item, index) => (
                <MenuItem key={item.href} item={item} index={index + mainNavItems.length + quickActions.length} />
              ))}
            </div>
          </div>

          {/* Brand Elements */}
          <div className="pt-6 border-t border-warm-grey/20">
            <div className="bg-gradient-to-r from-terracotta/10 to-sage/10 rounded-2xl p-4 text-center">
              <div className="text-3xl mb-2">✨</div>
              <p className="text-sm text-charcoal/70 font-medium">
                Transform memories into beautiful prints
              </p>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-charcoal/50">
                <span className="flex items-center gap-1">
                  🇬🇧 UK made
                </span>
                <span className="flex items-center gap-1">
                  🔒 Secure
                </span>
                <span className="flex items-center gap-1">
                  ✅ Guaranteed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}