import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// You might add DropdownMenu here later
// import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const TopBar = ({ user }) => {
  const fallback = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="h-16 bg-gray-900/50 backdrop-blur-sm p-4 flex justify-end items-center sticky top-0 z-40">
      {/* Add DropdownMenuTrigger here if you want a menu */}
      <Avatar className="cursor-pointer h-9 w-9 border-2 border-gray-700 hover:border-indigo-400 transition-colors">
        <AvatarImage src={user?.image} alt={user?.name || 'User Avatar'} />
        <AvatarFallback className="bg-gray-700 text-gray-300">
          {fallback}
        </AvatarFallback>
      </Avatar>
      {/* Add DropdownMenuContent here */}
    </header>
  );
};

export default TopBar;
