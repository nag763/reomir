import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut } from 'lucide-react';
import Link from 'next/link'; // Import Link for navigation
import { signOut } from 'next-auth/react';

// Placeholder function for sign out - replace with your actual sign out logic
const handleSignOut = () => {
  signOut({
    callbackUrl: '/', // Redirect to sign in page after sign out
  });
  // Add your sign out logic here (e.g., using next-auth)
};

const TopBar = ({ user }) => {
  // Use user's initials or 'U' as a fallback for the avatar
  const fallback = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <header className="h-16 bg-gray-900/50 backdrop-blur-sm p-4 flex justify-end items-center sticky top-0 z-40 border-b border-gray-800/60">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* The Avatar acts as the trigger */}
          <Avatar className="cursor-pointer h-9 w-9 border-2 border-gray-700 hover:border-indigo-400 transition-colors">
            <AvatarImage src={user?.image} alt={user?.name || 'User Avatar'} />
            <AvatarFallback className="bg-gray-700 text-gray-300 font-mono text-sm">
              {fallback}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-56 mr-4 mt-2 bg-gray-800 text-gray-100 border-gray-700 font-mono shadow-xl" // Apply dark theme styles
          align="end" // Aligns the menu to the right edge
        >
          <DropdownMenuLabel className="text-gray-400">
            <div className="font-bold">{user?.name || 'User'}</div>
            <div className="text-xs font-normal">
              {user?.email || 'No email'}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          <Link href="/auth/settings" passHref>
            <DropdownMenuItem className="cursor-pointer hover:bg-gray-700 !text-gray-100 focus:bg-gray-700 focus:!text-white">
              <Settings className="mr-2 h-4 w-4" />
              <span>Parameters</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuItem
            className="cursor-pointer !text-red-400 hover:!bg-red-900/50 focus:!bg-red-900/50 focus:!text-red-300"
            onClick={handleSignOut} // Attach sign out handler
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default TopBar;
