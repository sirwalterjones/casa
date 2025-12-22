import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/useAuth';

interface NavigationProps {
  currentPage?: string;
}

export default function Navigation({ currentPage }: NavigationProps) {
  const { user, organization, logout } = useAuth();
  const { hasRole, isAdmin } = usePermissions();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Check if user is super admin
  const isSuperAdmin = hasRole(['casa_super_admin', 'administrator']) ||
    user?.email === 'walter@joneswebdesigns.com';

  // Define navigation items with role-based access
  const allNavigationItems = [
    { name: 'Dashboard', href: '/dashboard', key: 'dashboard', roles: ['administrator', 'casa_administrator', 'casa_super_admin', 'supervisor', 'casa_supervisor', 'volunteer', 'casa_volunteer'] },
    { name: 'Cases', href: '/cases', key: 'cases', roles: ['administrator', 'casa_administrator', 'casa_super_admin', 'supervisor', 'casa_supervisor', 'volunteer', 'casa_volunteer'] },
    { name: 'Volunteers', href: '/volunteers/list', key: 'volunteers', roles: ['administrator', 'casa_administrator', 'casa_super_admin', 'supervisor', 'casa_supervisor'] },
    { name: 'Reports', href: '/reports/comprehensive', key: 'reports', roles: ['administrator', 'casa_administrator', 'casa_super_admin', 'supervisor', 'casa_supervisor', 'volunteer', 'casa_volunteer'] },
    { name: 'Documents', href: '/documents', key: 'documents', roles: ['administrator', 'casa_administrator', 'casa_super_admin', 'supervisor', 'casa_supervisor', 'volunteer', 'casa_volunteer'] },
    { name: 'Settings', href: '/settings', key: 'settings', roles: ['administrator', 'casa_administrator', 'casa_super_admin'] },
  ];

  // Filter navigation items based on user role
  const navigation = allNavigationItems.filter(item => {
    return item.roles.some(role => hasRole(role));
  });

  const isCurrentPage = (href: string) => {
    if (currentPage) {
      return currentPage === href;
    }
    return router.pathname === href || router.pathname.startsWith(href.split('?')[0]);
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/dashboard" className="text-2xl font-bold text-indigo-600 hover:text-indigo-700">
                CASA
              </Link>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigation.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      isCurrentPage(item.href)
                        ? 'bg-indigo-700 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* User profile section */}
          <div className="flex items-center">
            <div className="ml-4 flex items-center md:ml-6">
              {/* User info */}
              <div className="text-right mr-4 hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{organization?.name}</p>
              </div>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </button>

                {/* Profile dropdown menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    {isSuperAdmin && (
                      <Link
                        href="/super-admin"
                        className="block px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 font-medium"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        Super Admin
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        Settings
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden ml-3">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <span className="sr-only">Open main menu</span>
                  <svg
                    className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <svg
                    className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile navigation menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {navigation.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                    isCurrentPage(item.href)
                      ? 'bg-indigo-700 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile user info */}
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="px-3">
                  <div className="text-base font-medium text-gray-800">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-sm font-medium text-gray-500">{organization?.name}</div>
                </div>
                <div className="mt-3 px-2 space-y-1">
                  {isSuperAdmin && (
                    <Link
                      href="/super-admin"
                      className="block px-3 py-2 rounded-md text-base font-medium text-purple-700 hover:bg-purple-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Super Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close profile menu */}
      {isProfileMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsProfileMenuOpen(false)}
        />
      )}
    </nav>
  );
}