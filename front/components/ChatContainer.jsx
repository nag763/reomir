// components/ChatContainer.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import ChatMessagesDisplay from './ChatMessagesDisplay';
import ChatMessageInput from './ChatMessageInput';
import { callAuthenticatedApi } from '@/lib/apiClient';

const predefinedSuggestions = [
  'Help me add a new member to my organization.',
  'What are my current project statuses?',
  'Show me technology news from the last 24 hours.',
];

const ChatContainer = ({ appName, determinedUserId, commandInputRef }) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // For displaying errors to the user

  const acquireSession = async () => {
    if (sessionId) return sessionId; // Return existing session if available
    setIsLoading(true);
    setError(null);
    try {
      console.log('Acquiring session for user:', determinedUserId);
      const response = await callAuthenticatedApi('agent/session', {
        method: 'POST',
        // Backend might infer userId from token, or you might need to send it.
        // If your API expects a body:
        // body: JSON.stringify({ userId: determinedUserId, appName: appName })
      });
      if (!response || !response.id) {
        throw new Error('Failed to acquire session or session ID missing.');
      }
      console.log('Session acquired:', response.id);
      setSessionId(response.id);
      return response.id;
    } catch (err) {
      console.error('Error acquiring session:', err);
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
    if (!inputText.trim() || !determinedUserId) {
      if (!determinedUserId) {
        setError('User ID is not available. Cannot send message.');
        setMessages((prev) => [
          ...prev,
          {
            id: `syserr-${Date.now()}`,
            role: 'system',
            text: 'Error: User information missing.',
          },
        ]);
      }
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

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await acquireSession();
      if (!currentSessionId) {
        // Error is handled and displayed by acquireSession
        setIsLoading(false);
        return;
      }
    }

    const payload = {
      appName: appName,
      userId: 'user',
      sessionId: currentSessionId,
      newMessage: {
        role: 'user',
        parts: [{ text: inputText }],
      },
      streaming: false,
    };

    console.log('Sending message with payload:', payload);

    try {
      const response = await callAuthenticatedApi('agent/run', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('Received response:', response);

      if (!response || !response.length === 0) {
        throw new Error('Invalid response structure from the bot.');
      }

      const lastPart = response.at(-1);

      if (!lastPart || !lastPart.content || !lastPart.content.parts) {
        throw new Error(
          'Response does not contain expected content structure.',
        );
      }

      const botText = lastPart.content.parts.at(-1).text;
      const botMessage = {
        id: lastPart.id || `bot-${Date.now()}`,
        role: 'model',
        text: botText,
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
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
      commandInputRef.current?.focus(); // Refocus input after message send/error
    }
  };

  // Optional: Attempt to acquire session when component mounts if userId is available.
  // This makes the first message send faster as session is already established.
  useEffect(() => {
    if (determinedUserId && !sessionId) {
      // acquireSession(); // You might want to call this if you want a session ready on load
    }
  }, [determinedUserId, sessionId]);

  const isNewConversation = messages.length === 0;

  return (
    // This div will be a flex column and take up all available space in its parent (main)
    // min-h-0 is important for flex children that might overflow
    <div className="flex flex-col flex-1 min-h-0">
      <ChatMessagesDisplay messages={messages} />{' '}
      {/* This component is already flex-1 */}
      {error &&
        !messages.find(
          (msg) => msg.role === 'system' && msg.text.includes(error),
        ) && (
          <div className="p-1 text-center text-red-500 text-xs shrink-0">
            {' '}
            {/* shrink-0 for error msg */}
            {error}
          </div>
        )}
      <ChatMessageInput // This will naturally be at the bottom of this flex container.
        ref={commandInputRef} // Its own "sticky bottom-0" reinforces this.
        suggestions={predefinedSuggestions}
        showSuggestionsCondition={isNewConversation}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ChatContainer;
