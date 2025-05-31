// dashboard/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '@/components/UserProfileProvider';
import ChatMessagesDisplay from '@/components/ChatMessagesDisplay';
import ChatMessageInput from '@/components/ChatMessageInput';
import { acquireChatSession, sendChatMessage } from '@/lib/chatApiService'; // Import new service

const predefinedSuggestions = [
  'Help me add a new member to my organization.',
  'What are my current project statuses?',
  'Show me technology news from the last 24 hours.',
];

export default function Dashboard() {
  const { data: authSession } = useSession(); // Renamed to avoid conflict with chat sessionId
  const commandInputRef = useRef(null);
  const { profile } = useUserProfile();

  const determinedUserId =
    profile?.id || authSession?.user?.id || 'anonymous_user';
  const appName = 'waving_agent';

  const [chatSessionId, setChatSessionId] = useState(null); // Renamed for clarity
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Wrapper function to manage component state around session acquisition
  const ensureSession = async () => {
    if (chatSessionId) return chatSessionId;

    setIsLoading(true);
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
    setIsLoading(true);
    setError(null);

    try {
      let currentSessionId = chatSessionId;
      if (!currentSessionId) {
        currentSessionId = await ensureSession(); // This now uses the service
      }

      if (!currentSessionId) {
        // Error is handled and displayed by ensureSession, and isLoading will be false
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
      commandInputRef.current?.focus();
    }
  };

  // Optional: Attempt to acquire session when component mounts if userId is available.
  useEffect(() => {
    if (determinedUserId && !chatSessionId) {
      // ensureSession(); // Call if you want a session ready on load.
      // Consider if you want to handle loading/error states here specifically
      // or let the first message trigger it.
    }
  }, [determinedUserId, chatSessionId]); // Removed ensureSession from deps to avoid loop if called directly

  const isNewConversation = messages.length === 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ChatMessagesDisplay messages={messages} />
      {error &&
        !messages.find(
          (msg) => msg.role === 'system' && msg.text.includes(error),
        ) && (
          <div className="p-1 text-center text-red-500 text-xs shrink-0">
            {error}
          </div>
        )}
      <ChatMessageInput
        ref={commandInputRef}
        suggestions={predefinedSuggestions}
        showSuggestionsCondition={isNewConversation}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
