// dashboard/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '@/components/UserProfileProvider';
import GitHubConnectPopup from '@/components/GitHubConnectPopup'; // Added
import ChatMessagesDisplay from '@/components/ChatMessagesDisplay';
import ChatMessageInput from '@/components/ChatMessageInput';
import { acquireChatSession, sendChatMessage } from '@/lib/chatApiService';

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

  const [chatSessionId, setChatSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // For general loading, like input disabling
  const [isBotTyping, setIsBotTyping] = useState(false); // For typing indicator
  const [error, setError] = useState(null);

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

  const ensureSession = async () => {
    if (chatSessionId) return chatSessionId;

    setIsLoading(true); // General loading for session acquisition
    setError(null);
    try {
      const newSessionId = await acquireChatSession(determinedUserId, appName);
      setChatSessionId(newSessionId);
      return newSessionId;
    } catch (err) {
      console.error('Dashboard: Error acquiring session:', err);
      const errorMessage = err.message || 'Could not start a chat session.';
      setError(errorMessage);
      setMessages((prev) => [
        ...prev,
        {
          id: `syserr-${Date.now()}`,
          role: 'system',
          text: `Error: ${errorMessage}`,
        },
      ]);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (inputText) => {
    if (!inputText.trim()) return;

    if (!determinedUserId) {
      const errMsg = 'User ID is not available. Cannot send message.';
      setError(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: `syserr-${Date.now()}`,
          role: 'system',
          text: `Error: ${errMsg}`,
        },
      ]);
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: inputText,
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true); // Disable input, show general loading if any
    setIsBotTyping(true); // Show typing indicator
    setError(null);

    try {
      let currentSessionId = chatSessionId;
      if (!currentSessionId) {
        currentSessionId = await ensureSession();
      }

      if (!currentSessionId) {
        // Error is handled and displayed by ensureSession
        return;
      }

      const botMessage = await sendChatMessage(
        inputText,
        determinedUserId,
        appName,
        currentSessionId,
      );
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (err) {
      console.error('Dashboard: Error sending message:', err);
      const errorMessage =
        err.message || 'Failed to get a response from the bot.';
      setError(errorMessage);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: `syserr-${Date.now()}`,
          role: 'system',
          text: `Error: ${errorMessage}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsBotTyping(false); // Hide typing indicator
      commandInputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (determinedUserId && !chatSessionId) {
      // ensureSession(); // Optional: Call if you want a session ready on load.
    }
  }, [determinedUserId, chatSessionId]);

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
          onSendMessage={handleSendMessage}
          isLoading={isLoading} // This prop disables the input during any loading
        />
      </div>
    </>
  );
}
