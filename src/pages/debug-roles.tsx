import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/useAuth';
import Head from 'next/head';

export default function DebugRoles() {
  const { user, organization } = useAuth();
  const { hasRole, isAdmin, isSupervisor, isSuperAdmin } = usePermissions();

  return (
    <>
      <Head>
        <title>Debug Roles - CASA</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Debug User Roles</h1>
          
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">User Information</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Organization Information</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(organization, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Role Checks</h2>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="font-medium">Is Admin:</span>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${isAdmin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {isAdmin ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium">Is Supervisor:</span>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${isSupervisor ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {isSupervisor ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium">Is Super Admin:</span>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${isSuperAdmin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {isSuperAdmin ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Role Tests</h2>
            <div className="space-y-2">
              {['administrator', 'casa_administrator', 'supervisor', 'casa_supervisor', 'volunteer', 'casa_volunteer'].map(role => (
                <div key={role} className="flex items-center">
                  <span className="font-medium">Has role '{role}':</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${hasRole(role) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {hasRole(role) ? 'Yes' : 'No'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 