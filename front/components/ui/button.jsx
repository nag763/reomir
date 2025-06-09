'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-gray-900', // Assuming dark background for ring offset
  {
    variants: {
      variant: {
        default:
          'bg-indigo-600 text-gray-100 hover:bg-indigo-700 focus-visible:ring-indigo-500',
        destructive:
          'bg-red-600 text-gray-100 hover:bg-red-700 focus-visible:ring-red-500',
        destructiveOutline:
          'border border-red-600 bg-transparent text-red-400 hover:bg-red-700/20 hover:text-red-300 focus-visible:ring-red-500',
        outline:
          'border border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700 hover:text-gray-100 focus-visible:ring-gray-500',
        secondary:
          'bg-gray-600 text-gray-100 hover:bg-gray-700 border border-gray-600 hover:border-gray-700 focus-visible:ring-gray-500',
        ghost:
          'text-gray-300 hover:bg-gray-700 hover:text-gray-100 focus-visible:ring-gray-500',
        link: 'text-indigo-400 hover:underline focus-visible:ring-indigo-500',
        'indigo-outline':
          'border border-indigo-500 bg-transparent text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 focus-visible:ring-indigo-500',
        'indigo-ghost':
          'text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 focus-visible:ring-indigo-500',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
