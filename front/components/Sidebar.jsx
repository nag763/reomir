'use client';

import React from 'react';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LayoutDashboard, Newspaper, Github, Settings } from 'lucide-react';

const navItems = [
  { href: '/auth/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/auth/news', icon: Newspaper, label: 'News Feed' },
  { href: 'auth//github', icon: Github, label: 'GitHub' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar = () => {
  return (
    <aside
      className="
            h-screen w-16 bg-gray-900 text-gray-100 p-4 border-r border-gray-800
            flex flex-col items-center
            fixed left-0 top-0 bottom-0
            hover:w-64 transition-all duration-300 ease-in-out
            group overflow-hidden z-50
        "
    >
      {/* Logo or Title */}
      <div className="flex items-center justify-center h-16 mb-8 w-full">
        <div
          className="
                    text-3xl font-bold
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100
                    whitespace-nowrap
               "
        >
          re<span className="text-indigo-400">o</span>mir
        </div>
        <div
          className="
                    absolute left-4 top-6
                    text-3xl font-bold text-indigo-400
                    opacity-100 group-hover:opacity-0 transition-opacity duration-200
                "
        >
          r.
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 w-full">
        <TooltipProvider delayDuration={0}>
          <ul className="space-y-3">
            {navItems.map((item) => (
              <li key={item.label}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className="
                                                flex items-center h-12 p-4 rounded-lg
                                                text-gray-400 hover:text-white hover:bg-gray-800
                                                transition-colors duration-200
                                                w-full
                                            "
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span
                        className="
                                                ml-4
                                                opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100
                                                whitespace-nowrap
                                            "
                      >
                        {item.label}
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="
                                        block group-hover:hidden ml-2 bg-gray-800 text-white border-gray-700 font-mono
                                     "
                  >
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
        </TooltipProvider>
      </nav>

      {/* Optional: Bottom/Settings Link */}
      {/* ... */}
    </aside>
  );
};

export default Sidebar;
