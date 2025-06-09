// front/hooks/useFeedback.js
import { useState, useCallback, useRef, useEffect } from 'react';

const DEFAULT_TIMEOUT_DURATION = 3000;

/**
 * Custom hook for managing feedback messages with an auto-clear timeout.
 * @param {number} [timeoutDuration=3000] - The duration in milliseconds after which the feedback message clears.
 * @returns {{
 *   feedback: { message: string, type: 'info' | 'success' | 'error' | string },
 *   showFeedback: (message: string, type?: 'info' | 'success' | 'error' | string) => void
 * }}
 */
export const useFeedback = (timeoutDuration = DEFAULT_TIMEOUT_DURATION) => {
  const [feedback, setFeedback] = useState({ message: '', type: 'info' });
  const timeoutRef = useRef(null);

  const clearFeedback = useCallback(() => {
    setFeedback({ message: '', type: 'info' });
  }, []);

  const showFeedback = useCallback(
    (message, type = 'info') => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setFeedback({ message, type });

      // Set new timeout to clear the feedback
      timeoutRef.current = setTimeout(() => {
        clearFeedback();
        timeoutRef.current = null; // Clear the ref after timeout executes
      }, timeoutDuration);
    },
    [timeoutDuration, clearFeedback],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { feedback, showFeedback };
};
