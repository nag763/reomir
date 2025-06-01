import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './input'; // Assuming the path to your Input component

describe('Input Component', () => {
  it('renders correctly', () => {
    render(<Input placeholder="Test Input" />);
    expect(screen.getByPlaceholderText('Test Input')).toBeInTheDocument();
  });

  it('allows user to type and changes value', () => {
    render(<Input placeholder="Test Input" />);
    const inputElement = screen.getByPlaceholderText('Test Input');

    fireEvent.change(inputElement, { target: { value: 'Hello World' } });
    expect(inputElement.value).toBe('Hello World');
  });

  it('renders with a given default value', () => {
    render(<Input defaultValue="Default Value" />);
    const inputElement = screen.getByDisplayValue('Default Value');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement.value).toBe('Default Value');
  });

  it('disables the input when disabled prop is true', () => {
    render(<Input placeholder="Disabled Input" disabled />);
    const inputElement = screen.getByPlaceholderText('Disabled Input');
    expect(inputElement).toBeDisabled();
  });

  it('applies custom className', () => {
    const customClass = "my-custom-class";
    render(<Input placeholder="Custom Class Input" className={customClass} />);
    const inputElement = screen.getByPlaceholderText('Custom Class Input');
    expect(inputElement).toHaveClass(customClass);
  });
});
