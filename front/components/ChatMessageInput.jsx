// components/ChatMessageInput.js
'use client';

import React, { useState, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button'; // For suggestion pills
import { Send, Loader2, Terminal } from 'lucide-react';

const ChatMessageInput = forwardRef(
  (
    {
      onSendMessage,
      isLoading,
      initialPlaceholder = "Type your message...",
      suggestions = [], // Default to empty array
      showSuggestionsCondition = false, // Default to false
    },
    ref,
  ) => {
    const [inputValue, setInputValue] = useState('');

    const handleInputChange = (event) => {
      setInputValue(event.target.value);
    };

    const handleFormSubmit = async (event) => {
      event.preventDefault();
      if (inputValue.trim() && onSendMessage && !isLoading) {
        onSendMessage(inputValue);
        setInputValue(''); // Clear input after sending
      }
    };

    const handleSuggestionClick = (suggestionText) => {
      if (onSendMessage && !isLoading) {
        // We don't setInputValue here because onSendMessage will cause a re-render,
        // and the input is typically cleared after a message is sent by the form submission logic.
        // If onSendMessage doesn't clear the input, you might want to call setInputValue(suggestionText) first,
        // then onSendMessage. But for quick send, just calling onSendMessage is cleaner.
        onSendMessage(suggestionText);
        // inputValue will be cleared if handleFormSubmit's clear logic runs or by parent.
        // For now, let's assume onSendMessage leads to eventual input clear or doesn't rely on this component's input value.
        // To be safe, if we want suggestions to disappear immediately after click & send,
        // ensure onSendMessage will lead to input field in parent/this being cleared.
        // Since onSendMessage from ChatContainer does not directly clear inputValue here,
        // and handleFormSubmit (which clears inputValue) is not called on suggestion click,
        // we might need to manually clear it or rely on ChatContainer's behavior.
        // Let's rely on the fact that a new message will be added, and if isNewConversation was true, it might become false.
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleFormSubmit(event);
      }
    };

    const displaySuggestions = showSuggestionsCondition && inputValue === '' && suggestions.length > 0;
    console.log({displaySuggestions, suggestions})

    return (
      <footer className="p-4 border-t border-gray-800 mt-auto sticky bottom-0 bg-gray-900/80 backdrop-blur-sm z-40">
        {displaySuggestions && (
          <div className="mb-3 flex flex-wrap items-left justify-left gap-2 px-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-auto whitespace-normal text-xs sm:text-sm bg-gray-700/70 border-gray-600 hover:bg-gray-600/70 text-gray-200 hover:text-gray-100"
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isLoading}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
        <form onSubmit={handleFormSubmit} className="relative flex items-center gap-2">
          <Terminal className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            ref={ref}
            type="text"
            placeholder={isLoading ? 'Bot is thinking...' : initialPlaceholder}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="pl-10 flex-1 bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 font-mono rounded-md"
          />
          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            size="icon"
            variant="ghost"
            className="text-gray-400 hover:text-indigo-400 disabled:opacity-50 shrink-0"
            aria-label="Send message"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
          {/* Shortcut Hint - Conditionally hide if suggestions are shown and space is tight? For now, keep. */}
          <div className="absolute right-[calc(theme(spacing.4)_+_40px)] top-1/2 transform -translate-y-1/2 text-xs text-gray-600 pointer-events-none md:block hidden">
            <kbd className="px-2 py-0.5 border border-gray-700 bg-gray-800 rounded">Ctrl</kbd>
            <span className="mx-1">+</span>
            <kbd className="px-2 py-0.5 border border-gray-700 bg-gray-800 rounded">K</kbd>
          </div>
        </form>
      </footer>
    );
  },
);

ChatMessageInput.displayName = 'ChatMessageInput';
export default ChatMessageInput;