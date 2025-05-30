// dashboard/page.js
'use client';

import React, { useRef, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import CommandBar from '@/components/CommandBar';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '@/components/UserProfileProvider';
// import Sidebar from '@/components/Sidebar'; // If you have a Sidebar component

export default function Dashboard() {
  const { data: session } = useSession();
  const { profile } = useUserProfile();
  const commandInputRef = useRef(null);

  const user = {
    name: profile?.displayName || session?.user?.name || 'User',
    email: session?.user?.email || '',
    image: session?.user?.image || null,
  };

  useEffect(() => {
    document.title = 'Dashboard';
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === 'k' || event.key === '/')
      ) {
        event.preventDefault();
        commandInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-mono flex">
      {/* <Sidebar /> */} {/* Example: If you had a Sidebar */}
      <div className="flex-1 flex flex-col h-screen">
        {' '}
        {/* Consider adjusting ml-16 if sidebar is present */}
        <TopBar user={user} />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-lg text-gray-400">Welcome back, {user.name}!</p>
          {user.email && (
            <p className="text-sm text-gray-500">Email: {user.email}</p>
          )}

          {/* Dashboard Widgets */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-3">Latest News</h2>
              {/* Placeholder for News feed content */}
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-3">
                GitHub Vulnerabilities
              </h2>
              {/* Placeholder for GitHub scan results */}
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-3">Confluence Q&A</h2>
              {/* Placeholder for Confluence integration */}
            </div>
          </div>
        </main>
        <CommandBar ref={commandInputRef} />
      </div>
    </div>
  );
}
