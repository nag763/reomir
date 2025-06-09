// front/hooks/useChat.test.js
import React from 'react';
import { render, act } from '@testing-library/react';
import { useChat } from './useChat';
import * as chatActions from '@/actions/chatActions';

// Mock chatActions
jest.mock('@/actions/chatActions', () => ({
  acquireChatSession: jest.fn(),
  sendChatMessage: jest.fn(),
}));

// A helper component to use the hook and display its state
const TestComponent = ({ hookProps, children }) => {
  const hookValues = useChat(...hookProps);
  return children(hookValues);
};

describe('useChat Hook', () => {
  const determinedUserId = 'testUser';
  const appName = 'testApp';
  const mockSessionId = 'session123';

  let getHookValues; // Function to get current hook values

  const renderHook = (props) => {
    let currentHookValues;
    render(
      <TestComponent hookProps={props}>
        {(values) => {
          currentHookValues = values;
          return null; // No UI needed for these tests
        }}
      </TestComponent>,
    );
    return () => currentHookValues; // Return a function that gives current values
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    chatActions.acquireChatSession.mockResolvedValue(mockSessionId);
    chatActions.sendChatMessage.mockResolvedValue({
      id: 'bot-msg-1',
      role: 'model',
      text: 'Parsed bot response',
    });
    getHookValues = renderHook([determinedUserId, appName]);
  });

  it('should have correct initial state', () => {
    const { messages, isLoading, isBotTyping, error, chatSessionId } =
      getHookValues();
    expect(messages).toEqual([]);
    expect(isLoading).toBe(false);
    expect(isBotTyping).toBe(false);
    expect(error).toBeNull();
    expect(chatSessionId).toBeNull();
  });

  describe('handleSendMessage', () => {
    const inputText = 'Hello there';

    it('should acquire session if not present and then send message', async () => {
      let { handleSendMessage } = getHookValues();

      await act(async () => {
        await handleSendMessage(inputText);
      });

      const { messages, isLoading, isBotTyping, error, chatSessionId } =
        getHookValues();

      expect(chatActions.acquireChatSession).toHaveBeenCalledWith(
        determinedUserId,
        appName,
      );
      expect(chatSessionId).toBe(mockSessionId);
      expect(chatActions.sendChatMessage).toHaveBeenCalledWith(
        inputText,
        determinedUserId,
        appName,
        mockSessionId,
      );

      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].text).toBe(inputText);
      expect(messages[1].role).toBe('model');
      expect(messages[1].text).toBe('Parsed bot response');

      expect(isLoading).toBe(false);
      expect(isBotTyping).toBe(false);
      expect(error).toBeNull();
    });

    it('should use existing session ID if present', async () => {
      // First, ensure session is set
      await act(async () => {
        // Directly call ensureSession logic or simulate a message send that sets it
        // For simplicity, let's assume a first message was sent or session was pre-acquired
        // We can also "pre-load" the state for this specific test if needed,
        // but let's try by calling ensureSession via a first sendMessage.
        await getHookValues().handleSendMessage(
          'Initial message to get session',
        );
      });

      // Clear mocks from the first call to isolate the second call
      jest.clearAllMocks();
      chatActions.sendChatMessage.mockResolvedValue({
        // Reset sendChatMessage mock for the second call
        id: 'bot-msg-2',
        role: 'model',
        text: 'Second response',
      });

      let { handleSendMessage } = getHookValues(); // get fresh handle
      await act(async () => {
        await handleSendMessage(inputText);
      });

      const { messages, chatSessionId: currentSessionId } = getHookValues();

      expect(chatActions.acquireChatSession).not.toHaveBeenCalled(); // Should not be called again
      expect(currentSessionId).toBe(mockSessionId);
      expect(chatActions.sendChatMessage).toHaveBeenCalledWith(
        inputText,
        determinedUserId,
        appName,
        mockSessionId,
      );
      expect(messages.find((m) => m.text === 'Second response')).toBeTruthy();
    });

    it('should handle error during session acquisition', async () => {
      chatActions.acquireChatSession.mockRejectedValueOnce(
        new Error('Session Failed'),
      );
      let { handleSendMessage } = getHookValues();

      await act(async () => {
        await handleSendMessage(inputText);
      });

      const { messages, isLoading, isBotTyping, error, chatSessionId } =
        getHookValues();

      expect(chatActions.acquireChatSession).toHaveBeenCalledWith(
        determinedUserId,
        appName,
      );
      expect(chatSessionId).toBeNull();
      expect(chatActions.sendChatMessage).not.toHaveBeenCalled();

      expect(messages.length).toBe(2); // User message + system error message
      expect(messages[0].text).toBe(inputText);
      expect(messages[1].role).toBe('system');
      expect(messages[1].text).toContain('Error: Session Failed');

      expect(isLoading).toBe(false); // Should reset after error
      expect(isBotTyping).toBe(false); // Should reset after error
      expect(error).toBe('Session Failed');
    });

    it('should handle error during message sending', async () => {
      chatActions.sendChatMessage.mockRejectedValueOnce(
        new Error('Send Failed'),
      );
      let { handleSendMessage } = getHookValues();

      await act(async () => {
        await handleSendMessage(inputText);
      });

      const { messages, isLoading, isBotTyping, error, chatSessionId } =
        getHookValues();

      expect(chatActions.acquireChatSession).toHaveBeenCalledTimes(1); // Assuming no prior session
      expect(chatSessionId).toBe(mockSessionId);
      expect(chatActions.sendChatMessage).toHaveBeenCalledWith(
        inputText,
        determinedUserId,
        appName,
        mockSessionId,
      );

      expect(messages.length).toBe(2); // User message + system error message
      expect(messages[0].text).toBe(inputText);
      expect(messages[1].role).toBe('system');
      expect(messages[1].text).toContain('Error: Send Failed');

      expect(isLoading).toBe(false);
      expect(isBotTyping).toBe(false);
      expect(error).toBe('Send Failed');
    });

    it('should set loading and bot typing states correctly', async () => {
      let { handleSendMessage, isLoading, isBotTyping } = getHookValues();

      // Use a promise that doesn't resolve immediately to check intermediate states
      let resolveSendChatMessage;
      chatActions.sendChatMessage.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSendChatMessage = resolve;
        }),
      );

      // Initial state before send
      expect(isLoading).toBe(false);
      expect(isBotTyping).toBe(false);

      let sendPromise;
      act(() => {
        sendPromise = handleSendMessage(inputText);
      });

      // State during send
      ({ isLoading, isBotTyping } = getHookValues());
      expect(isLoading).toBe(true);
      expect(isBotTyping).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolveSendChatMessage({
          id: 'bot-msg-1',
          role: 'model',
          text: 'Delayed response',
        });
        await sendPromise;
      });

      // State after send
      ({ isLoading, isBotTyping } = getHookValues());
      expect(isLoading).toBe(false);
      expect(isBotTyping).toBe(false);
    });

    it('should not send message if inputText is empty or whitespace', async () => {
      let { handleSendMessage } = getHookValues();
      await act(async () => {
        await handleSendMessage('   ');
      });

      const { messages } = getHookValues();
      expect(chatActions.acquireChatSession).not.toHaveBeenCalled();
      expect(chatActions.sendChatMessage).not.toHaveBeenCalled();
      expect(messages.length).toBe(0);
    });

    it('should display error if determinedUserId is missing', async () => {
      getHookValues = renderHook([null, appName]); // No user ID
      let { handleSendMessage } = getHookValues();

      await act(async () => {
        await handleSendMessage(inputText);
      });

      const { messages, error } = getHookValues();
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe('system');
      expect(messages[0].text).toContain('User ID is not available');
      expect(error).toBe('User ID is not available. Cannot send message.');
    });
  });
});
