import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from './checkbox'; // Assuming the path to your Checkbox component

describe('Checkbox Component', () => {
  it('renders correctly with default state (unchecked)', () => {
    render(<Checkbox id="test-checkbox" />);
    const checkboxElement = screen.getByRole('checkbox');
    expect(checkboxElement).toBeInTheDocument();
    expect(checkboxElement).not.toBeChecked();
    expect(checkboxElement).toHaveAttribute('aria-checked', 'false');
  });

  it('renders correctly when initially checked', () => {
    render(<Checkbox id="test-checkbox-checked" checked />);
    const checkboxElement = screen.getByRole('checkbox');
    expect(checkboxElement).toBeInTheDocument();
    expect(checkboxElement).toBeChecked();
    expect(checkboxElement).toHaveAttribute('aria-checked', 'true');
  });

  it('changes state and aria-checked attribute when clicked', () => {
    render(<Checkbox id="test-checkbox-click" />);
    const checkboxElement = screen.getByRole('checkbox');

    // Initial state: unchecked
    expect(checkboxElement).not.toBeChecked();
    expect(checkboxElement).toHaveAttribute('aria-checked', 'false');

    // Click to check
    fireEvent.click(checkboxElement);
    expect(checkboxElement).toBeChecked();
    expect(checkboxElement).toHaveAttribute('aria-checked', 'true');

    // Click to uncheck
    fireEvent.click(checkboxElement);
    expect(checkboxElement).not.toBeChecked();
    expect(checkboxElement).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onCheckedChange callback with the new state when clicked', () => {
    const mockOnCheckedChange = jest.fn();
    render(<Checkbox id="test-checkbox-callback" onCheckedChange={mockOnCheckedChange} />);
    const checkboxElement = screen.getByRole('checkbox');

    fireEvent.click(checkboxElement);
    expect(mockOnCheckedChange).toHaveBeenCalledTimes(1);
    expect(mockOnCheckedChange).toHaveBeenCalledWith(true);

    fireEvent.click(checkboxElement);
    expect(mockOnCheckedChange).toHaveBeenCalledTimes(2);
    expect(mockOnCheckedChange).toHaveBeenCalledWith(false);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Checkbox id="test-checkbox-disabled" disabled />);
    const checkboxElement = screen.getByRole('checkbox');
    expect(checkboxElement).toBeDisabled();
    // Check that clicking does not change state
    expect(checkboxElement).not.toBeChecked();
    fireEvent.click(checkboxElement);
    expect(checkboxElement).not.toBeChecked();
  });

  it('applies custom className', () => {
    const customClass = "my-custom-checkbox-class";
    render(<Checkbox id="test-checkbox-class" className={customClass} />);
    // The actual input is hidden, the visual element receives the class.
    // We need to find the element that would visually represent the checkbox.
    // Radix Checkbox typically applies className to the root element.
    const checkboxElement = screen.getByRole('checkbox');
    expect(checkboxElement).toHaveClass(customClass);
  });

  it('has an accessible name via aria-label or associated label', () => {
    // Test with aria-label
    render(<Checkbox id="c1" aria-label="My Checkbox" />);
    expect(screen.getByLabelText('My Checkbox')).toBeInTheDocument();

    // Test with associated label
    render(
      <>
        <label htmlFor="c2">My Other Checkbox</label>
        <Checkbox id="c2" />
      </>
    );
    expect(screen.getByLabelText('My Other Checkbox')).toBeInTheDocument();
  });
});
