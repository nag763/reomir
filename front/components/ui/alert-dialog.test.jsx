import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from './alert-dialog'; // Adjust path as necessary

describe('AlertDialog Component', () => {
  const mockOnContinue = jest.fn();

  const TestAlertDialog = ({ onContinueAction, title, description }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button>Open Dialog</button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title || 'Are you absolutely sure?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description ||
              'This action cannot be undone. This will permanently delete your account and remove your data from our servers.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onContinueAction || mockOnContinue}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  beforeEach(() => {
    // Clear mock before each test
    mockOnContinue.mockClear();
  });

  it('is initially hidden', () => {
    render(<TestAlertDialog />);
    // The content of the dialog should not be present in the document until triggered.
    // Radix typically conditionally renders the content or hides it accessibly.
    // We'll check for the absence of the title, which is more specific than role="alertdialog".
    expect(screen.queryByText('Are you absolutely sure?')).toBeNull();
  });

  it('becomes visible when its trigger is clicked', () => {
    render(<TestAlertDialog />);
    const triggerButton = screen.getByText('Open Dialog');
    fireEvent.click(triggerButton);

    // Content should become visible. Radix might take a moment to animate.
    // Using findBy queries which wait for elements to appear.
    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(screen.getByText('Are you absolutely sure?')).toBeVisible();
  });

  it('contains the expected title, description, and buttons when open', async () => {
    render(
      <TestAlertDialog title="Test Title" description="Test Description." />,
    );
    const triggerButton = screen.getByText('Open Dialog');
    fireEvent.click(triggerButton);

    // Wait for the dialog to be fully open and elements to be available
    expect(await screen.findByText('Test Title')).toBeVisible();
    expect(screen.getByText('Test Description.')).toBeVisible();
    expect(screen.getByText('Cancel')).toBeVisible();
    expect(screen.getByText('Continue')).toBeVisible();
  });

  it('closes when the Cancel button is clicked', async () => {
    render(<TestAlertDialog />);
    const triggerButton = screen.getByText('Open Dialog');
    fireEvent.click(triggerButton);

    // Wait for dialog to open
    const dialogTitle = await screen.findByText('Are you absolutely sure?');
    expect(dialogTitle).toBeVisible();

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Dialog should close. Radix might animate, so wait for disappearance.
    await waitFor(() => {
      expect(screen.queryByText('Are you absolutely sure?')).toBeNull();
    });
  });

  it('executes the action and closes when the Continue button is clicked', async () => {
    const specificMockAction = jest.fn();
    render(<TestAlertDialog onContinueAction={specificMockAction} />);
    const triggerButton = screen.getByText('Open Dialog');
    fireEvent.click(triggerButton);

    // Wait for dialog to open
    const dialogTitle = await screen.findByText('Are you absolutely sure?');
    expect(dialogTitle).toBeVisible();

    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    expect(specificMockAction).toHaveBeenCalledTimes(1);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Are you absolutely sure?')).toBeNull();
    });
  });
});
