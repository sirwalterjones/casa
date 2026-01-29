import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/useAuth';
import ThemeToggle from '@/components/common/ThemeToggle';

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
    { name: 'Pipeline', href: '/volunteers/pipeline', key: 'pipeline', roles: ['administrator', 'casa_administrator', 'casa_super_admin', 'supervisor', 'casa_supervisor'] },
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
    <nav className="nav-bar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link
                href="/dashboard"
                className="text-2xl font-bold transition-colors duration-200"
                style={{ color: 'var(--color-accent-primary)' }}
              >
                CASA
              </Link>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-1">
                {navigation.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`nav-link ${isCurrentPage(item.href) ? 'active' : ''}`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right side: Theme toggle, user info, profile */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle size="md" />

            <div className="ml-2 flex items-center md:ml-4">
              {/* User info - hidden on small screens */}
              <div className="text-right mr-4 hidden sm:block">
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {user?.firstName} {user?.lastName}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {organization?.name}
                </p>
              </div>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="avatar-btn focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    '--tw-ring-color': 'var(--color-accent-primary)',
                    '--tw-ring-offset-color': 'var(--color-bg-primary)'
                  } as React.CSSProperties}
                >
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </button>

                {/* Profile dropdown menu */}
                {isProfileMenuOpen && (
                  <div className="dropdown-menu">
                    {isSuperAdmin && (
                      <Link
                        href="/super-admin"
                        className="dropdown-item font-medium"
                        style={{ color: 'var(--color-accent-secondary)' }}
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        Super Admin
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        href="/settings"
                        className="dropdown-item"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        Settings
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        href="/admin/audit"
                        className="dropdown-item"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        Audit Log
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        href="/admin/feedback"
                        className="dropdown-item"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        Feedback Admin
                      </Link>
                    )}
                    <Link
                      href="/feedback"
                      className="dropdown-item"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      My Feedback
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="dropdown-item w-full text-left"
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
                  className="inline-flex items-center justify-center p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2"
                  style={{
                    color: 'var(--color-text-secondary)',
                    '--tw-ring-color': 'var(--color-accent-primary)'
                  } as React.CSSProperties}
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
            <div
              className="px-2 pt-2 pb-3 space-y-1 sm:px-3"
              style={{ borderTop: '1px solid var(--color-border-subtle)' }}
            >
              {navigation.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                    isCurrentPage(item.href) ? 'nav-link active' : 'nav-link'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              {/* Mobile user info */}
              <div
                className="pt-4 pb-3"
                style={{ borderTop: '1px solid var(--color-border-subtle)' }}
              >
                <div className="px-3">
                  <div
                    className="text-base font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {organization?.name}
                  </div>
                </div>
                <div className="mt-3 px-2 space-y-1">
                  {isSuperAdmin && (
                    <Link
                      href="/super-admin"
                      className="block px-3 py-2 rounded-lg text-base font-medium transition-colors duration-200"
                      style={{ color: 'var(--color-accent-secondary)' }}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Super Admin
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      href="/admin/feedback"
                      className="block px-3 py-2 rounded-lg text-base font-medium transition-colors duration-200"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Feedback Admin
                    </Link>
                  )}
                  <Link
                    href="/feedback"
                    className="block px-3 py-2 rounded-lg text-base font-medium transition-colors duration-200"
                    style={{ color: 'var(--color-text-secondary)' }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Feedback
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium transition-colors duration-200"
                    style={{ color: 'var(--color-text-secondary)' }}
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