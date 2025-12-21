import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Wait for auth state to load
    if (loading) return;

    // Redirect based on auth status
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  // Show loading state while checking auth or redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <h2 className="mt-4 text-lg font-medium text-gray-900">Loading CASA System...</h2>
        <p className="mt-2 text-sm text-gray-500">Please wait while we verify your authentication.</p>
      </div>
    </div>
  );
}