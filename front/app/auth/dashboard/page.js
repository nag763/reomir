// dashboard/page.js
'use client';

import React, { useRef, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import ChatContainer from '@/components/ChatContainer'; // Import the new container
import { useSession } from 'next-auth/react';
import { useUserProfile } from '@/components/UserProfileProvider';

export default function Dashboard() {
  const { data: session } = useSession();
  const commandInputRef = useRef(null); // This ref will be passed to ChatMessageInput via ChatContainer

  const { profile } = useUserProfile();

  // Determine userId. Prioritize profile, then session.
  // Ensure this aligns with what your backend expects or can derive from the auth token.
  const determinedUserId = profile?.id || session?.user?.id || 'anonymous_user'; // Fallback, adjust as needed
  const appName = 'waving_agent'; // As per your example

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
    <ChatContainer
      appName={appName}
      determinedUserId={determinedUserId}
      commandInputRef={commandInputRef}
    />
  );
}
