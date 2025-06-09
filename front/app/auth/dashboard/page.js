// dashboard/page.js
'use client';

// dashboard/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '@/components/UserProfileProvider';
import GitHubConnectPopup from '@/components/GitHubConnectPopup';
import ChatMessagesDisplay from '@/components/ChatMessagesDisplay';
import ChatMessageInput from '@/components/ChatMessageInput';
import { useChat } from '@/hooks/useChat'; // Import the custom hook

const predefinedSuggestions = [
  'What are the latest updates from the major cloud providers over the past 24 hours ?',
  "What are Google's past week announcements ?",
];

export default function Dashboard() {
  const { data: authSession } = useSession();
  const commandInputRef = useRef(null);
  const { profile } = useUserProfile();

  const determinedUserId =
    profile?.uid || authSession?.user?.id || 'anonymous_user';
  const appName = 'coordinator';

  // Use the custom hook for chat state and logic
  const {
    messages,
    isLoading,
    isBotTyping,
    error,
    handleSendMessage,
  } = useChat(determinedUserId, appName);

  // State for GitHub Connect Popup
  const [showGitHubConnectPopup, setShowGitHubConnectPopup] = useState(false);

  useEffect(() => {
    document.title = 'Dashboard - Chat';
  }, []);

  useEffect(() => {
    if (profile && !profile.isLoadingProfile && !profile.github_connected) {
      const dismissed = localStorage.getItem('hasDismissedGitHubPopup');
      if (dismissed !== 'true') {
        setShowGitHubConnectPopup(true);
      }
    }
  }, [profile]);

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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Effect to focus input after bot stops typing if no general loading is active
  useEffect(() => {
    if (!isBotTyping && !isLoading) {
      commandInputRef.current?.focus();
    }
  }, [isBotTyping, isLoading]);

  const isNewConversation = messages.length === 0;

  const handleConnectGitHubFromPopup = () => {
    localStorage.setItem('hasDismissedGitHubPopup', 'true');
    setShowGitHubConnectPopup(false);
    // Redirect to GitHub connection initiation URL
    window.location.href = '/api/v1/github/connect';
  };

  const handleClosePopup = () => {
    localStorage.setItem('hasDismissedGitHubPopup', 'true');
    setShowGitHubConnectPopup(false);
  };

  return (
    <>
      <GitHubConnectPopup
        open={showGitHubConnectPopup}
        onOpenChange={handleClosePopup} // Handles closing via X, overlay click, or Esc
        onConnect={handleConnectGitHubFromPopup}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Dashboard heading if needed, or keep existing chat UI as primary */}
        {messages.length === 0 && !isLoading && (
          <div className="p-4 text-center">
            <h1 className="text-xl text-gray-400">Dashboard</h1>
            <p className="text-sm text-gray-500">
              Start a conversation or explore features.
            </p>
          </div>
        )}
        <ChatMessagesDisplay messages={messages} isBotTyping={isBotTyping} />
        {error &&
          !messages.find(
            (msg) => msg.role === 'system' && msg.text.includes(error),
          ) && (
            <div className="shrink-0 p-1 text-center text-xs text-red-500">
              {error}
            </div>
          )}
        <ChatMessageInput
          ref={commandInputRef}
          suggestions={predefinedSuggestions}
          showSuggestionsCondition={isNewConversation}
          onSendMessage={handleSendMessage} // Use handleSendMessage from the hook
          isLoading={isLoading} // isLoading from the hook now controls this
        />
      </div>
    </>
  );
}
