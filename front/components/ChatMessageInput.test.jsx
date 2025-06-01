import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatMessageInput from './ChatMessageInput'; // Adjust path as necessary

describe('ChatMessageInput Component', () => {
  const mockOnSendMessage = jest.fn();

  beforeEach(() => {
    // Clear mock before each test
    mockOnSendMessage.mockClear();
  });

  it('renders the text input and send button', () => {
    render(<ChatMessageInput onSendMessage={mockOnSendMessage} />);
    expect(
      screen.getByPlaceholderText('Type your message...'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('updates input value when user types', () => {
    render(<ChatMessageInput onSendMessage={mockOnSendMessage} />);
    const inputElement = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(inputElement, { target: { value: 'Hello there!' } });
    expect(inputElement.value).toBe('Hello there!');
  });

  it('calls onSendMessage with the input value and clears input when send button is clicked', () => {
    render(<ChatMessageInput onSendMessage={mockOnSendMessage} />);
    const inputElement = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(inputElement, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(mockOnSendMessage).toHaveBeenCalledTimes(1);
    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    expect(inputElement.value).toBe('');
  });

  it('send button is disabled when input is empty and enabled when there is text', () => {
    render(<ChatMessageInput onSendMessage={mockOnSendMessage} />);
    const inputElement = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    // Initially, input is empty, button should be disabled
    expect(sendButton).toBeDisabled();

    // Type something, button should be enabled
    fireEvent.change(inputElement, { target: { value: 'Some text' } });
    expect(sendButton).not.toBeDisabled();

    // Clear text, button should be disabled again
    fireEvent.change(inputElement, { target: { value: '' } });
    expect(sendButton).toBeDisabled();
  });

  it('does not call onSendMessage if input is empty and send button is somehow clicked (e.g., if not properly disabled)', () => {
    render(<ChatMessageInput onSendMessage={mockOnSendMessage} />);
    const sendButton = screen.getByRole('button', { name: /send/i });

    // Attempt to click when disabled (should not call)
    fireEvent.click(sendButton);
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('handles multiline input correctly and still sends the full content', () => {
    render(<ChatMessageInput onSendMessage={mockOnSendMessage} />);
    const inputElement = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send/i });
    const multilineMessage = 'This is line one.\nThis is line two.';
    // Assuming the underlying input component converts newline characters to empty strings or spaces.
    // Based on the error, newlines are stripped: "This is line one.This is line two."
    const expectedSentMessage = 'This is line one.This is line two.';

    fireEvent.change(inputElement, { target: { value: multilineMessage } });
    fireEvent.click(sendButton);

    expect(mockOnSendMessage).toHaveBeenCalledTimes(1);
    expect(mockOnSendMessage).toHaveBeenCalledWith(expectedSentMessage);
    expect(inputElement.value).toBe('');
  });
});
