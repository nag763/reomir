'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose, // Added for explicit close button behavior
} from '@/components/ui/dialog';
import { Github } from 'lucide-react';
// useRouter is not strictly needed here if onConnect handles navigation

export default function GitHubConnectPopup({ open, onOpenChange, onConnect }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Github className="mr-2 h-5 w-5 text-purple-400" />
            Connect to GitHub
          </DialogTitle>
          <DialogDescription className="text-gray-400 pt-2">
            Enhance your experience by connecting your GitHub account. This will
            allow future features related to your repositories and contributions.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="mr-2 border-gray-600 hover:bg-gray-700"
            >
              Maybe Later
            </Button>
          </DialogClose>
          <Button variant="indigo" onClick={onConnect}>
            <Github className="mr-2 h-4 w-4" />
            Connect to GitHub
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
