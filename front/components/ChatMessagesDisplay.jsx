// components/ChatMessagesDisplay.js
'use client';

import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils'; // For conditional classnames (from shadcn/ui)

const ChatMessagesDisplay = ({ messages }) => {
  const scrollAreaViewportRef = useRef(null);

  useEffect(() => {
    if (scrollAreaViewportRef.current) {
      scrollAreaViewportRef.current.scrollTop = scrollAreaViewportRef.current.scrollHeight;
    }
  }, [messages]);

  if (!messages || messages.length === 0) {
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
                'max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg shadow text-sm whitespace-pre-wrap',
                msg.role === 'user' ? 'bg-indigo-600 text-white' : '',
                msg.role === 'model' ? 'bg-gray-700 text-gray-100' : '',
                msg.role === 'system' ? 'bg-red-700 text-white text-center w-full' : '', // For system/error messages
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
      </div>
    </ScrollArea>
  );
};

export default ChatMessagesDisplay;