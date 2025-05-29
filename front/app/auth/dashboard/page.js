'use client';

import React, { useRef, useEffect } from 'react'; // Import useRef and update useEffect import
import TopBar from '@/components/TopBar';
import CommandBar from '@/components/CommandBar';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { callAuthenticatedApi } from '@/lib/apiClient';
// Assuming Sidebar is needed for layout (even if not shown in your code snippet)
// import Sidebar from '@/components/Sidebar';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const commandInputRef = useRef(null); // Create a ref for the CommandBar input

  const user = {
    name: session.user?.name || 'User',
    email: session.user?.email || '',
    image: session.user?.image || null,
  };

  // Effect for handling keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check for Ctrl key (or Cmd key on Mac) + K or /
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === 'k' || event.key === '/')
      ) {
        event.preventDefault(); // Prevent default browser actions (like search)
        if (commandInputRef.current) {
          commandInputRef.current.focus(); // Focus the input
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup function to remove the event listener
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-mono flex">
      <title>Dashboard</title>
      {/* <Sidebar />  You likely need your Sidebar here */}
      {/* Main Content Area - Adjusts for sidebar width */}
      <div className="flex-1 ml-16 flex flex-col h-screen">
        {' '}
        {/* Ensure ml-16 is correct */}
        <TopBar user={user} />
        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {' '}
          {/* Added <main> and padding */}
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
              {/* <p className="text-gray-400">// Confluence integration goes here...</p> */}
            </div>
          </div>
          {/* --- End Widgets --- */}
        </main>{' '}
        {/* End <main> */}
        {/* Pass the ref to CommandBar */}
        <CommandBar ref={commandInputRef} />
      </div>
    </div>
  );
}
