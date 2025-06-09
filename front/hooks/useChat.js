// front/hooks/useChat.js
import { useState, useEffect, useCallback } from 'react';
import { acquireChatSession, sendChatMessage } from '@/actions/chatActions';

export const useChat = (determinedUserId, appName) => {
  const [chatSessionId, setChatSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // For general loading
  const [isBotTyping, setIsBotTyping] = useState(false); // For typing indicator
  const [error, setError] = useState(null);

  const ensureSession = useCallback(async () => {
    if (chatSessionId) return chatSessionId;

    // Prevent multiple simultaneous attempts if already loading session
    if (isLoading && !chatSessionId) return null;

    setIsLoading(true);
    setError(null);
    try {
      console.log('useChat: Acquiring session for', determinedUserId, appName);
      const newSessionId = await acquireChatSession(determinedUserId, appName);
      setChatSessionId(newSessionId);
      console.log('useChat: Session acquired', newSessionId);
      return newSessionId;
    } catch (err) {
      console.error('useChat: Error acquiring session:', err);
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
      // Only set isLoading to false if it wasn't a bot typing operation
      if (!isBotTyping) {
        setIsLoading(false);
      }
    }
  }, [determinedUserId, appName, chatSessionId, isLoading, isBotTyping]); // Added isLoading and isBotTyping to dependencies

  const handleSendMessage = useCallback(
    async (inputText) => {
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
      setIsLoading(true); // Disable input, show general loading
      setIsBotTyping(true); // Show typing indicator
      setError(null);

      try {
        let currentSessionId = chatSessionId;
        if (!currentSessionId) {
          console.log(
            'useChat: No session ID, calling ensureSession from handleSendMessage',
          );
          currentSessionId = await ensureSession();
        }

        if (!currentSessionId) {
          // Error is handled and displayed by ensureSession
          // Set loading states correctly if session acquisition failed
          setIsLoading(false);
          setIsBotTyping(false);
          return;
        }
        console.log('useChat: Sending message with session', currentSessionId);
        const botMessage = await sendChatMessage(
          inputText,
          determinedUserId,
          appName,
          currentSessionId,
        );
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      } catch (err) {
        console.error('useChat: Error sending message:', err);
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
        setIsBotTyping(false);
        // commandInputRef.current?.focus(); // This needs to be handled in the component
      }
    },
    [determinedUserId, appName, chatSessionId, ensureSession],
  ); // Removed internal state dependencies that are now part of the hook

  // Optional: Effect to pre-load session when component mounts and user/app info is available
  // This can be enabled if desired, but for now, session is acquired on first message.
  /*
  useEffect(() => {
    if (determinedUserId && appName && !chatSessionId && !isLoading) {
      // ensureSession(); // Call if you want a session ready on load.
    }
  }, [determinedUserId, appName, chatSessionId, isLoading, ensureSession]);
  */

  return {
    chatSessionId,
    messages,
    isLoading,
    isBotTyping,
    error,
    handleSendMessage,
    // ensureSession, // Expose if direct call needed from component, otherwise internal
  };
};
