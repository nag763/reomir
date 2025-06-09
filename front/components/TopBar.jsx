// components/TopBar.js
'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button'; // For the menu trigger
import { useUserProfile } from './UserProfileProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

const TopBar = ({}) => {
  const { session, profile } = useUserProfile();

  const user = {
    name: profile?.displayName || session?.user?.name || 'User',
    email: session?.user?.email || '',
    image: session?.user?.image || null,
  };

  const handleSignOut = useCallback(async () => {
    signOut({ callbackUrl: '/' });
  }, []);

  // if (!user) return null; // Or show a login button if user is not available

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-800/60 bg-gray-900/50 p-4 backdrop-blur-xs">
      <div className="flex items-center gap-4">
        {/* Logo/Brand Name */}
        <Link href="/auth/dashboard" className="flex items-center">
          <div className="text-2xl font-bold text-gray-100">
            re<span className="text-indigo-400">o</span>mir
          </div>
        </Link>
      </div>

      {/* User Profile Dropdown (existing) */}
      <div className="flex space-x-4">
        {user && ( // Conditionally render user menu if user object exists
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 cursor-pointer border-2 border-gray-700 transition-colors hover:border-indigo-400">
                <AvatarImage
                  src={user.image || undefined}
                  alt={user?.name || 'User Avatar'}
                />
                {/* Basic fallback if no image, you can customize this further */}
                {!user.image && (
                  <div className="flex h-full w-full items-center justify-center bg-gray-700 text-xs text-gray-400">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="mt-2 mr-4 w-56 border-gray-700 bg-gray-800 font-mono text-gray-100 shadow-xl"
              align="end"
            >
              <DropdownMenuLabel className="text-gray-400">
                <div className="font-bold">{user?.name || 'User'}</div>
                <div className="text-xs font-normal">
                  {user?.email || 'No email'}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-700" />
              <Link href="/auth/settings" passHref>
                <DropdownMenuItem className="cursor-pointer text-gray-100! hover:bg-gray-700 focus:bg-gray-700 focus:text-white!">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Parameters</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem
                className="cursor-pointer text-red-400! hover:bg-red-900/50! focus:bg-red-900/50! focus:text-red-300!"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!user && ( // Example: Show a login link if no user
          <Link href="/api/auth/signin" passHref>
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
};

export default TopBar;
