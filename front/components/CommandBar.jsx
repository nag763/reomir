import React from 'react';
import { Input } from '@/components/ui/input';
import { Terminal } from 'lucide-react';

const CommandBar = () => {
  return (
    <footer className="p-4 border-t border-gray-800 mt-auto sticky bottom-0 bg-gray-900/80 backdrop-blur-sm z-40">
      <div className="relative">
        <Terminal className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          type="text"
          placeholder="Type a command or search... (e.g., 'scan repo reomir-frontend')"
          className="
                        pl-10 pr-4 py-2 w-full
                        bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500
                        focus:ring-indigo-500 focus:border-indigo-500 font-mono
                        rounded-md
                    "
        />
        {/* You could add a 'K' icon or similar for cmd+k shortcut hint */}
      </div>
    </footer>
  );
};

export default CommandBar;
