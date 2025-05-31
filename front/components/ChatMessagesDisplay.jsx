// components/ChatMessagesDisplay.js
'use client';

import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area'; // shadcn/ui component
import { cn } from '@/lib/utils';

const ChatMessagesDisplay = ({ messages }) => {
  // Ref for the ScrollArea's viewport, as required by the component
  const scrollAreaViewportRef = useRef(null);
  // New ref for the element at the end of the messages
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    // When messages change, scroll the 'endOfMessagesRef' into view
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
      // You can also use behavior: 'auto' for an instant scroll
    }
  }, [messages]); // Re-run when messages array changes

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
        Start a conversation by typing below.
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4" viewportRef={scrollAreaViewportRef}>
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
                msg.role === 'system' ? 'bg-red-700 text-white text-center w-full' : '',
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
        {/* This invisible div is our target to scroll to */}
        <div ref={endOfMessagesRef} />
      </div>
    </ScrollArea>
  );
};

export default ChatMessagesDisplay;