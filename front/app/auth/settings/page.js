'use client';

import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { User, Trash2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { auth, signOut } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';

export default function SettingsPage() {
  const [confirmInput, setConfirmInput] = useState('');
  const isConfirmDisabled = confirmInput !== 'delete me';

  const router = useRouter();

  const { user, loading } = useAuth();

  // Placeholder function for delete action - replace with your actual API call
  const handleDeleteAccount = async () => {
    await signOut(auth);
    router.push('/'); // Redirect to sign-in
    return;
  };

  return (
    <div className="space-y-8 p-4 md:p-0">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <User className="mr-3 h-8 w-8 text-indigo-400" />
        User Settings
      </h1>

      {/* User Profile Card */}
      <Card className="bg-gray-800 border-gray-700 text-gray-100">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Avatar className="h-10 w-10 mr-4 border-2 border-gray-600">
              <AvatarImage src={user.providerData[0]?.photoURL} />
            </Avatar>
            Profile Details
          </CardTitle>
          <CardDescription className="text-gray-400">
            Your personal information within Reomir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 font-mono">
          <div>
            <Label className="text-gray-500">Name:</Label>
            <p className="text-lg">{user.displayName}</p>
          </div>
          <div>
            <Label className="text-gray-500">Email:</Label>
            <p className="text-lg">{user.email}</p>
          </div>
        </CardContent>
        {/* <CardFooter>
                    <Button variant="outline" className="border-indigo-500 text-indigo-400 hover:bg-indigo-900/50 hover:text-indigo-300">
                        Edit Profile (Not Implemented)
                    </Button>
                </CardFooter> */}
      </Card>

      {/* Danger Zone Card */}
      <Card className="bg-gray-800 border-red-900/60 text-gray-100">
        <CardHeader>
          <CardTitle className="text-xl flex items-center text-red-500">
            <AlertTriangle className="mr-3 h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription className="text-gray-400">
            Be careful! Actions in this zone are permanent and cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-red-700/50 rounded-lg bg-red-900/20">
            <h3 className="font-semibold text-red-400">Delete Your Account</h3>
            <p className="text-sm text-gray-300 mt-1">
              Once you delete your account, all your data, integrations, and
              configurations will be permanently erased. There is no going back.
              Please be certain.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-700 text-gray-100 font-mono">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl text-red-500 flex items-center">
                  <AlertTriangle className="mr-3 h-6 w-6" />
                  Account Self-Destruct Sequence Initiated!
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400 pt-4">
                  Woah there, code-slinger! Are you *absolutely* sure you want
                  to yeet your account into the digital void? All your precious
                  settings will be gone, like tears in rain... or that one
                  semicolon you spent hours looking for.
                  <br />
                  <br />
                  This action is{' '}
                  <strong className="text-red-400">IRREVERSIBLE</strong>. To
                  prove you&apos;re not just rage-quitting after a merge
                  conflict, type &quot;
                  <strong className="text-green-400">delete me</strong>&quot;
                  below.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Label htmlFor="confirm-delete" className="text-gray-400">
                  Confirm Deletion:
                </Label>
                <Input
                  id="confirm-delete"
                  className="mt-2 bg-gray-800 border-gray-600 focus:border-green-500 focus:ring-green-500 text-green-400 placeholder:text-gray-600"
                  placeholder="Type 'delete me' here..."
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  autoFocus
                />
              </div>
              <AlertDialogFooter className="sm:justify-between">
                <AlertDialogCancel
                  className="border-gray-600 bg-gray-600 hover:bg-gray-700"
                  onClick={() => setConfirmInput('')} // Clear input on cancel
                >
                  Phew, Cancel!
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isConfirmDisabled} // Disable if input doesn't match
                  onClick={() => {
                    if (!isConfirmDisabled) {
                      handleDeleteAccount();
                      setConfirmInput(''); // Clear input after action
                    }
                  }}
                >
                  Yes, Obliterate It!
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
