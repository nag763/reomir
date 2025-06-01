// components/ChatMessagesDisplay.js
'use client';

import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const ChatMessagesDisplay = ({ messages, isBotTyping }) => {
  // Added isBotTyping prop
  const scrollAreaViewportRef = useRef(null);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isBotTyping]); // Re-run when messages or typing status changes

  if (!messages || (messages.length === 0 && !isBotTyping)) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
        Start a conversation by typing below.
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4" viewportref={scrollAreaViewportRef}>
      <div className="space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              className={cn(
                'max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg shadow-sm text-sm whitespace-pre-wrap',
                msg.role === 'user' ? 'bg-indigo-600 text-white' : '',
                msg.role === 'model' ? 'bg-gray-700 text-gray-100' : '',
                msg.role === 'system'
                  ? 'bg-red-700 text-white text-center w-full'
                  : '',
              )}
            >
              <p>{msg.text}</p>
              {msg.role !== 'system' && (
                <span className="text-xs opacity-70 block text-right mt-1">
                  {msg.role === 'model' ? 'Bot' : 'You'}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isBotTyping && (
          <div className="flex justify-start">
            <div className="max-w-xl lg:max-w-2xl px-4 py-3 rounded-lg shadow-sm text-sm bg-gray-700 text-gray-100">
              <div className="flex items-center space-x-1.5 h-5">
                {' '}
                {/* Adjusted spacing and height */}
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
              {/* Optional: "Bot is typing..." text, can be removed if dots are enough */}
              {/* <span className="text-xs opacity-70 block text-right mt-1">
                Bot is typing...
              </span> */}
            </div>
          </div>
        )}

        <div ref={endOfMessagesRef} />
      </div>
    </ScrollArea>
  );
};

export default ChatMessagesDisplay;
