'use client';

import React, { useState, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Terminal } from 'lucide-react';

/**
 * @typedef {object} ChatMessageInputProps
 * @property {function} onSendMessage - Callback fired when the user submits a message. Required.
 * @property {boolean} isLoading - Indicates if a message is currently being processed (e.g., waiting for a bot response). Disables input and shows a loader.
 * @property {string} [initialPlaceholder='Type your message...'] - Placeholder text for the input field when not loading.
 * @property {string[]} [suggestions=[]] - An array of suggestion strings to display as clickable pills.
 * @property {boolean} [showSuggestionsCondition=false] - Condition under which to show the suggestions (e.g., only for a new conversation and empty input).
 */

/**
 * A component for users to type and send chat messages.
 * It includes an input field, a send button, and optional suggestion pills.
 * Uses `forwardRef` to allow parent components to focus the input field.
 * @param {ChatMessageInputProps} props - The props for the component.
 * @param {React.Ref} ref - The ref forwarded to the input element.
 */
const ChatMessageInput = forwardRef(
  (
    {
      onSendMessage,
      isLoading,
      initialPlaceholder = 'Type your message...',
      suggestions = [],
      showSuggestionsCondition = false,
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
        onSendMessage(suggestionText);
        // Input clearing is handled by the parent or the form submission logic.
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleFormSubmit(event);
      }
    };

    const displaySuggestions =
      showSuggestionsCondition && inputValue === '' && suggestions.length > 0;

    return (
      <footer className="sticky bottom-0 z-40 mt-auto border-t border-gray-800 bg-gray-900/80 p-4 backdrop-blur-xs">
        {displaySuggestions && (
          <div className="items-left justify-left mb-3 flex flex-wrap gap-2 px-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-auto border-gray-600 bg-gray-700/70 text-xs whitespace-normal text-gray-200 hover:bg-gray-600/70 hover:text-gray-100 sm:text-sm"
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isLoading}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
        <form
          onSubmit={handleFormSubmit}
          className="relative flex items-center gap-2"
        >
          <Terminal className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
          <Input
            ref={ref}
            type="text"
            placeholder={isLoading ? 'Bot is thinking...' : initialPlaceholder}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 rounded-md border-gray-700 bg-gray-800 pl-10 font-mono text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500"
          />
          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            size="icon"
            variant="ghost"
            className="shrink-0 text-gray-400 hover:text-indigo-400 disabled:opacity-50"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
          <div className="pointer-events-none absolute top-1/2 right-[calc(--spacing(4)+40px)] hidden -translate-y-1/2 transform text-xs text-gray-600 md:block">
            <kbd className="rounded border border-gray-700 bg-gray-800 px-2 py-0.5">
              Ctrl
            </kbd>
            <span className="mx-1">+</span>
            <kbd className="rounded border border-gray-700 bg-gray-800 px-2 py-0.5">
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
