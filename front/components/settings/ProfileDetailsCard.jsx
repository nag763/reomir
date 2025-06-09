// front/components/settings/ProfileDetailsCard.jsx
import React, { useState, useEffect, useRef } from 'react';
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
import { User } from 'lucide-react'; // Icon for the card title

export const ProfileDetailsCard = ({
  user, // { name, email, image }
  profile, // from useUserProfile, contains displayName
  updateProfile,
  showFeedback,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const inputRef = useRef(null);

  const currentName = profile?.displayName || user?.name || '';

  useEffect(() => {
    setDisplayName(currentName);
  }, [currentName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Optionally, select the text
      // inputRef.current.select();
    }
  }, [isEditing]);

  const handleEditToggle = () => {
    if (isEditing) {
      // If cancelling edit, reset display name to current profile name
      setDisplayName(currentName);
    }
    setIsEditing(!isEditing);
  };

  const handleProfileSave = async () => {
    if (displayName.trim() === currentName || !displayName.trim()) {
      showFeedback(
        displayName.trim()
          ? 'No changes made to profile name.'
          : 'Display name cannot be empty.',
        'info',
      );
      if (!displayName.trim()) setDisplayName(currentName); // Reset if empty
      setIsEditing(false); // Still exit editing mode if no changes
      return;
    }

    setIsUpdating(true);
    try {
      // Assuming updateProfile from useUserProfile handles refetching internally
      // or the second argument `true` is still relevant for its implementation.
      // Based on previous context, useUserProfile's updateProfile takes (data, refetch?)
      await updateProfile({ displayName: displayName.trim() }, true);
      showFeedback('Profile updated successfully!', 'success');
      setIsEditing(false);
    } catch (error) {
      showFeedback(`Error updating profile: ${error.message}`, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="border-gray-700 bg-gray-800 text-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Avatar className="mr-4 h-10 w-10 border-2 border-gray-600">
            <AvatarImage src={user?.image} alt={currentName} />
            <AvatarFallback>
              {currentName?.charAt(0).toUpperCase() || <User size={20} />}
            </AvatarFallback>
          </Avatar>
          Profile Details
        </CardTitle>
        <CardDescription className="text-gray-400">
          Manage your personal information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 font-mono">
        <div>
          <Label htmlFor="displayNameInput" className="text-gray-500">
            Name:
          </Label>
          {isEditing ? (
            <Input
              id="displayNameInput"
              ref={inputRef}
              className="mt-1 border-gray-600 bg-gray-700 text-lg"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isUpdating}
            />
          ) : (
            <p className="pt-1 text-lg">{currentName || 'N/A'}</p>
          )}
        </div>
        <div>
          <Label className="text-gray-500">Email:</Label>
          <p className="pt-1 text-lg">{user?.email || 'N/A'}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        {isEditing ? (
          <>
            <Button
              variant="indigo-ghost" // Assuming this variant exists or use 'ghost'
              onClick={handleEditToggle}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProfileSave}
              disabled={
                isUpdating ||
                displayName.trim() === currentName ||
                !displayName.trim()
              }
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <Button
            variant="indigo-outline" // Assuming this variant exists or use 'outline'
            onClick={handleEditToggle}
          >
            Edit Profile
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
