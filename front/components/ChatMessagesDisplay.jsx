'use client';

import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

/**
 * @typedef {object} Message
 * @property {string} id - Unique identifier for the message.
 * @property {'user' | 'model' | 'system'} role - The role of the message sender.
 * @property {string} text - The content of the message. HTML is allowed for 'model' role.
 */

/**
 * @typedef {object} ChatMessagesDisplayProps
 * @property {Message[]} messages - An array of message objects to display.
 * @property {boolean} isBotTyping - Flag to indicate if the bot is currently typing.
 */

/**
 * Renders a list of chat messages and a typing indicator.
 * Automatically scrolls to the latest message.
 * @param {ChatMessagesDisplayProps} props - The props for the component.
 */
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
      <div className="flex flex-1 items-center justify-center p-4 text-gray-500">
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
                'max-w-xl rounded-lg px-4 py-2 text-sm whitespace-pre-wrap shadow-sm lg:max-w-2xl',
                msg.role === 'user' ? 'bg-indigo-600 text-white' : '',
                msg.role === 'model' ? 'bg-gray-700 text-gray-100' : '',
                msg.role === 'system'
                  ? 'w-full bg-red-700 text-center text-white'
                  : '',
              )}
            >
              {msg.role === 'user' ? (
                <p>{msg.text}</p>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: msg.text }} />
              )}
              {msg.role !== 'system' && (
                <span className="mt-1 block text-right text-xs opacity-70">
                  {msg.role === 'model' ? 'Bot' : 'You'}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isBotTyping && (
          <div className="flex justify-start">
            <div className="max-w-xl rounded-lg bg-gray-700 px-4 py-3 text-sm text-gray-100 shadow-sm lg:max-w-2xl">
              <div className="flex h-5 items-center space-x-1.5">
                {' '}
                {/* Adjusted spacing and height */}
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={endOfMessagesRef} />
      </div>
    </ScrollArea>
  );
};

export default ChatMessagesDisplay;
