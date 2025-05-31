import React, { forwardRef } from 'react'; // Import forwardRef
import { Input } from '@/components/ui/input';
import { Terminal } from 'lucide-react';
import { callAuthenticatedApi } from '@/lib/apiClient'; // Your API client

// Wrap the component with forwardRef
const CommandBar = forwardRef((props, ref) => {
  callAuthenticatedApi('agent/session', { method: 'POST' });
  return (
    <footer className="p-4 border-t border-gray-800 mt-auto sticky bottom-0 bg-gray-900/80 backdrop-blur-sm z-40">
      <div className="relative flex items-center">
        <Terminal className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          ref={ref} // Attach the forwarded ref to the Input
          type="text"
          placeholder="Type a command or search..."
          className="
                        pl-10 pr-28 py-2 w-full // Add more right padding for the hint
                        bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500
                        focus:ring-indigo-500 focus:border-indigo-500 font-mono
                        rounded-md
                    "
        />
        {/* Visual Hint for the shortcut */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-600 pointer-events-none">
          <kbd className="px-2 py-0.5 border border-gray-700 bg-gray-800 rounded">
            Ctrl
          </kbd>
          <span className="mx-1">+</span>
          <kbd className="px-2 py-0.5 border border-gray-700 bg-gray-800 rounded">
            K
          </kbd>
        </div>
      </div>
    </footer>
  );
});

// Add a display name for better debugging
CommandBar.displayName = 'CommandBar';

export default CommandBar;
