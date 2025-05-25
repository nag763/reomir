'use client';
import React from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import CommandBar from '@/components/CommandBar';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import LoadingScreen from '@/components/LoadingScreen';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/');
  }, [session, status, router]);

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (!session) {
    return <div>Access Denied</div>;
  }

  const user = {
    name: session.user?.name || 'User',
    email: session.user?.email || '',
    image: session.user?.image || null,
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-mono flex">
      <Sidebar />

      {/* Main Content Area - Adjusts for sidebar width */}
      <div className="flex-1 ml-16 flex flex-col h-screen">
        <TopBar user={user} />
        {/* Page Content */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-lg text-gray-400">Welcome back, {user.name}!</p>
          <p className="text-sm text-gray-500">Email: {user.email}</p>

          {/* --- Add Your Dashboard Widgets Here --- */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-3">Latest News</h2>
              {/* <p className="text-gray-400">// News feed content goes here...</p> */}
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-3">
                GitHub Vulnerabilities
              </h2>
              {/* <p className="text-gray-400">// GitHub scan results go here...</p> */}
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-3">Confluence Q&A</h2>
              {/* <p className="text-gray-400">
                // Confluence integration goes here...
              </p> */}
            </div>
          </div>
          {/* --- End Widgets --- */}
        </div>
        <CommandBar />
      </div>
    </div>
  );
}
