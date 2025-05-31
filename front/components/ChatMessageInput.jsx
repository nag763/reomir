// components/ChatMessageInput.js
'use client';

import React, { useState, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Terminal } from 'lucide-react';

const ChatMessageInput = forwardRef(
  ({ onSendMessage, isLoading, initialPlaceholder = "Type your message..." }, ref) => {
    const [inputValue, setInputValue] = useState('');

    const handleInputChange = (event) => {
      setInputValue(event.target.value);
    };

    const handleSubmit = async (event) => {
      event.preventDefault();
      if (inputValue.trim() && onSendMessage && !isLoading) {
        onSendMessage(inputValue);
        setInputValue('');
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit(event);
      }
    };

    return (
      <footer className="p-4 border-t border-gray-800 mt-auto sticky bottom-0 bg-gray-900/80 backdrop-blur-sm z-40">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <Terminal className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            ref={ref}
            type="text"
            placeholder={isLoading ? 'Bot is thinking...' : initialPlaceholder}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="
              pl-10 flex-1  // Removed pr-28, button will take space
              bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500
              focus:ring-indigo-500 focus:border-indigo-500 font-mono
              rounded-md
            "
          />
          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            size="icon"
            variant="ghost"
            className="text-gray-400 hover:text-indigo-400 disabled:opacity-50 shrink-0" // shrink-0 prevents button from shrinking
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
          {/* Visual Hint for the shortcut can remain if this input is still the target for Ctrl+K */}
          <div className="absolute right-[calc(theme(spacing.4)_+_40px)] top-1/2 transform -translate-y-1/2 text-xs text-gray-600 pointer-events-none md:block hidden">
            <kbd className="px-2 py-0.5 border border-gray-700 bg-gray-800 rounded">
              Ctrl
            </kbd>
            <span className="mx-1">+</span>
            <kbd className="px-2 py-0.5 border border-gray-700 bg-gray-800 rounded">
              K
            </kbd>
          </div>
        </form>
      </footer>
    );
  },
);

ChatMessageInput.displayName = 'ChatMessageInput';
export default ChatMessageInput;