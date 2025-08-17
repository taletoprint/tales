'use client';

import Link from 'next/link';

export default function QuickActions() {
  const actions = [
    {
      title: 'Review Approvals',
      description: 'Check orders ready for print approval',
      href: '/admin/approvals',
      icon: '✅',
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
    },
    {
      title: 'View Analytics',
      description: 'Preview generation insights and costs',
      href: '/admin/analytics',
      icon: '📈',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      title: 'All Orders',
      description: 'Browse and manage all orders',
      href: '/admin/orders',
      icon: '📦',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
    {
      title: 'Preview Gallery',
      description: 'Browse generated images with metadata',
      href: '/admin/analytics/gallery',
      icon: '🖼️',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    },
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`block p-4 border rounded-lg transition-colors ${action.color}`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <span className="text-2xl">{action.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900">{action.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{action.description}</p>
              </div>
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}