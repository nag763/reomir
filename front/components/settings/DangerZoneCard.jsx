// front/components/settings/DangerZoneCard.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle } from 'lucide-react';

export const DangerZoneCard = ({ deleteProfile, showFeedback }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = () => setIsDialogOpen(true);
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setConfirmInput(''); // Reset input when dialog closes
  };

  const handleDeleteAccountConfirm = async () => {
    setIsDeleting(true);
    try {
      // deleteProfile is expected to handle sign-out and redirect.
      // Feedback shown here might only be visible briefly if redirect is immediate.
      await deleteProfile();
      // If deleteProfile doesn't throw, it implies success and redirection will occur.
      // No need to set isDeleting(false) if component unmounts.
    } catch (error) {
      console.error('Delete account error:', error);
      showFeedback(
        `Error deleting account: ${error.message || 'An unexpected error occurred.'}`,
        'error',
      );
      setIsDeleting(false); // Reset state only if error occurs and no redirect
    }
  };

  const isConfirmDeleteDisabled = confirmInput !== 'delete me';

  return (
    <Card className="border-red-900/60 bg-gray-800 text-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-red-500">
          <AlertTriangle className="mr-3 h-5 w-5" /> Danger Zone
        </CardTitle>
        <CardDescription className="text-gray-400">
          Permanent and irreversible actions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-red-700/50 bg-red-900/20 p-4">
          <h3 className="font-semibold text-red-400">Delete Your Account</h3>
          <p className="mt-1 text-sm text-gray-300">
            All your data will be permanently erased. This action cannot be
            undone.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              onClick={handleOpenDialog}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete My Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-gray-700 bg-gray-900 font-mono text-gray-100">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center text-2xl text-red-500">
                <AlertTriangle className="mr-3 h-6 w-6" /> Confirm Account
                Deletion
              </AlertDialogTitle>
              <AlertDialogDescription className="pt-4 text-gray-400">
                Are you absolutely sure? This action is irreversible. To
                confirm, type &quot;
                <strong className="text-green-400">delete me</strong>&quot;
                below.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="confirm-delete-input" className="text-gray-400">
                Confirm Deletion:
              </Label>
              <Input
                id="confirm-delete-input"
                className="mt-2 border-gray-600 bg-gray-800 text-green-400 placeholder:text-gray-600 focus:border-green-500 focus:ring-green-500"
                placeholder="Type 'delete me' here..."
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                autoFocus
              />
            </div>
            <AlertDialogFooter className="sm:justify-between">
              <AlertDialogCancel
                variant="secondary" // Assuming 'secondary' variant exists or use 'outline'/'ghost'
                onClick={handleCloseDialog}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive" // This should apply destructive button styling
                disabled={isConfirmDeleteDisabled || isDeleting}
                onClick={() => {
                  if (!isConfirmDeleteDisabled) {
                    handleDeleteAccountConfirm();
                  }
                }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete It'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
};
