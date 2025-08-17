"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import MobileMenu from './mobile-menu';

interface HeaderProps {
  variant?: 'default' | 'minimal';
  showCreateButton?: boolean;
}

interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

const defaultNavLinks: NavLink[] = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/examples', label: 'Examples' },
  { href: '/faq', label: 'FAQ' }
];

export default function Header({ variant = 'default', showCreateButton = true }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.split('#')[0]);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur-sm border-b border-warm-grey/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center py-2">
              <Image 
                src="/images/logo/ttp_logo.png" 
                alt="TaleToPrint"
                width={128}
                height={64}
                className="h-14 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            {variant === 'default' && (
              <nav className="hidden desktop:flex items-center space-x-6">
                {defaultNavLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`
                      text-sm font-medium transition-colors duration-200
                      ${isActive(link.href) 
                        ? 'text-terracotta' 
                        : 'text-sage hover:text-terracotta'
                      }
                    `}
                  >
                    {link.label}
                  </a>
                ))}
                
                {showCreateButton && (
                  <Link 
                    href="/#create"
                    className="ml-4 px-6 py-2 bg-terracotta text-cream rounded-lg hover:bg-charcoal transition-colors font-medium text-sm"
                  >
                    Create artwork
                  </Link>
                )}
              </nav>
            )}

            {/* Minimal variant - just CTA */}
            {variant === 'minimal' && showCreateButton && (
              <Link 
                href="/#create"
                className="hidden desktop:block px-6 py-2 bg-terracotta text-cream rounded-lg hover:bg-charcoal transition-colors font-medium text-sm"
              >
                Create yours
              </Link>
            )}

            {/* Mobile menu button */}
            <button 
              onClick={toggleMobileMenu}
              className="desktop:hidden p-2 rounded-lg hover:bg-warm-grey/10 transition-colors"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span 
                  className={`
                    block h-0.5 w-6 bg-charcoal transition-all duration-300
                    ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : 'translate-y-0'}
                  `} 
                />
                <span 
                  className={`
                    block h-0.5 w-6 bg-charcoal transition-all duration-300 mt-1.5
                    ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}
                  `} 
                />
                <span 
                  className={`
                    block h-0.5 w-6 bg-charcoal transition-all duration-300 mt-1.5
                    ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : 'translate-y-0'}
                  `} 
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu 
        isOpen={mobileMenuOpen} 
        onClose={closeMobileMenu} 
      />
    </>
  );
}