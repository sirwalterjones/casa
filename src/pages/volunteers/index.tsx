import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function VolunteersIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/volunteers/list');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirecting to volunteers...</p>
      </div>
    </div>
  );
}
