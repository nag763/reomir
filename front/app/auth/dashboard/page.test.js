// front/app/auth/dashboard/page.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from './page'; // The component to test
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/hooks/useChat', () => ({
  useChat: jest.fn(),
}));
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));
jest.mock('@/components/UserProfileProvider', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('@/components/ChatMessagesDisplay', () => {
  // Name the function for better debugging
  function MockChatMessagesDisplay({ messages, isBotTyping }) {
    return (
      <div data-testid="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} data-testid={`message-${msg.id}`}>
            {msg.text}
          </div>
        ))}
        {isBotTyping && (
          <div data-testid="typing-indicator">Bot is typing...</div>
        )}
      </div>
    );
  }
  return MockChatMessagesDisplay;
});

jest.mock('@/components/ChatMessageInput', () => {
  // Define the component using React.forwardRef
  const MockChatMessageInput = React.forwardRef(
    ({ onSendMessage, isLoading }, ref) => (
      <div data-testid="chat-input">
        <input
          type="text"
          data-testid="message-input-field"
          disabled={isLoading}
          ref={ref}
        />
        <button
          onClick={() => onSendMessage('Test message from input')}
          data-testid="send-button"
        >
          Send
        </button>
      </div>
    ),
  );

  // Assign the displayName for debugging React DevTools
  MockChatMessageInput.displayName = 'MockChatMessageInput';

  return MockChatMessageInput;
});

describe('Dashboard Component', () => {
  let mockUseChatValues;
  let mockUseSessionValues;
  let mockUseUserProfileValues;

  beforeEach(() => {
    // Reset mocks for each test
    mockUseChatValues = {
      messages: [],
      isLoading: false,
      isBotTyping: false,
      error: null,
      handleSendMessage: jest.fn(),
    };
    require('@/hooks/useChat').useChat.mockReturnValue(mockUseChatValues);

    mockUseSessionValues = {
      data: { user: { id: 'testSessionUser' } },
      status: 'authenticated',
    };
    require('next-auth/react').useSession.mockReturnValue(mockUseSessionValues);

    mockUseUserProfileValues = {
      profile: { uid: 'testProfileUser', github_connected: true },
      isLoadingProfile: false,
    };
    require('@/components/UserProfileProvider').useUserProfile.mockReturnValue(
      mockUseUserProfileValues,
    );

    // Mock localStorage for GitHub popup dismissal
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.getItem.mockRestore();
    localStorage.setItem.mockRestore();
  });

  it('renders correctly with initial state from useChat', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument(); // Initial empty state heading
  });

  it('displays messages from useChat hook', () => {
    mockUseChatValues.messages = [{ id: '1', text: 'Hello', role: 'user' }];
    render(<Dashboard />);
    expect(screen.getByTestId('message-1')).toHaveTextContent('Hello');
  });

  it('shows typing indicator when isBotTyping is true', () => {
    mockUseChatValues.isBotTyping = true;
    render(<Dashboard />);
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });

  it('displays error message from useChat hook', () => {
    mockUseChatValues.error = 'Something went wrong';
    // Ensure error is not already in a system message to trigger the specific error display div
    mockUseChatValues.messages = [];
    render(<Dashboard />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls handleSendMessage from useChat when input triggers send', () => {
    render(<Dashboard />);
    const inputField = screen.getByTestId('message-input-field');
    fireEvent.change(inputField, { target: { value: 'Test message' } }); // Not strictly necessary due to mock
    fireEvent.click(screen.getByTestId('send-button'));
    expect(mockUseChatValues.handleSendMessage).toHaveBeenCalledWith(
      'Test message from input',
    );
  });

  it('disables input when isLoading is true', () => {
    mockUseChatValues.isLoading = true;
    render(<Dashboard />);
    expect(screen.getByTestId('message-input-field')).toBeDisabled();
  });

  it('sets document title', () => {
    render(<Dashboard />);
    expect(document.title).toBe('Dashboard - Chat');
  });
});
