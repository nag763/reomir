// dashboard/page.js
'use client';

import React, { useRef, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import ChatContainer from '@/components/ChatContainer'; // Import the new container
import { useSession } from 'next-auth/react';
import { useUserProfile } from '@/components/UserProfileProvider';

export default function Dashboard() {
  const { data: session } = useSession();
  const { profile } = useUserProfile();
  const commandInputRef = useRef(null); // This ref will be passed to ChatMessageInput via ChatContainer

  // Determine userId. Prioritize profile, then session.
  // Ensure this aligns with what your backend expects or can derive from the auth token.
  const determinedUserId = profile?.id || session?.user?.id || 'anonymous_user'; // Fallback, adjust as needed
  const appName = 'waving_agent'; // As per your example

  const user = {
    name: profile?.displayName || session?.user?.name || 'User',
    email: session?.user?.email || '',
    image: session?.user?.image || null,
  };

  useEffect(() => {
    document.title = 'Dashboard - Chat';
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
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-mono flex">
      {/* <Sidebar /> */}
      <div className="flex-1 flex flex-col h-screen">
        <TopBar user={user} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {' '}
          {/* Key for layout */}
          {/* ChatContainer will now manage its children: ChatMessagesDisplay and ChatMessageInput */}
          <ChatContainer
            appName={appName}
            determinedUserId={determinedUserId}
            commandInputRef={commandInputRef}
          />
          {/* You can decide if the original dashboard content below the chat is still desired */}
          {/* Or if the chat interface takes the full main area */}
          {/* Example: Keeping other content (might need layout adjustments) */}
          {/*
          <div className="p-6 md:p-8 overflow-y-auto">
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-lg text-gray-400">Welcome back, {user.name}!</p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">Content 1</div>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">Content 2</div>
            </div>
          </div>
          */}
        </main>
        {/* ChatMessageInput is now rendered inside ChatContainer, so no separate CommandBar here unless it's for a different purpose */}
      </div>
    </div>
  );
}
