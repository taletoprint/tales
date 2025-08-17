"use client";

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import LogoutButton from './logout-button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  
  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/orders', label: 'Orders', icon: '📦' },
    { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
    { href: '/admin/approvals', label: 'Approvals', icon: '✅' },
  ];

  const isActive = (href: string) => {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="flex items-center gap-3 mr-6">
                  <Image
                    src="/images/logo/ttp_logo.png"
                    alt="TaleToPrint"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                  <h1 className="text-xl font-bold text-gray-900">Admin</h1>
                </Link>
              </div>
              {/* Desktop Navigation */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors
                      ${isActive(item.href)
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-label="Open menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="hidden sm:block sm:ml-4">
                <Suspense fallback={<div>Loading...</div>}>
                  <LogoutButton />
                </Suspense>
              </div>
            </div>
          </div>
          
          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-gray-200 bg-white">
              <div className="pt-2 pb-3 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 text-base font-medium transition-colors
                      ${isActive(item.href)
                        ? 'bg-blue-50 border-blue-500 text-blue-700 border-l-4'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
                
                {/* Mobile Logout */}
                <div className="px-4 py-3 border-t border-gray-200">
                  <Suspense fallback={<div>Loading...</div>}>
                    <LogoutButton />
                  </Suspense>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}