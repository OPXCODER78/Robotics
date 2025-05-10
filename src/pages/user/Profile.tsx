import { useState, useEffect, useCallback, memo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { Loader2, Save, UserCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button, Card, Input, Textarea } from '../../components/ui';

type ProfileFormData = {
  full_name: string;
  bio: string | null;
  website: string | null;
  avatar_url: string | null;
};

// Avatar component
const ProfileAvatar = memo(({ 
  avatarUrl, 
  handleAvatarChange 
}: { 
  avatarUrl: string | null; 
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
}) => (
  <div className="flex flex-col items-center space-y-4">
    <div className="relative w-32 h-32">
      <div className="absolute inset-0 rounded-full overflow-hidden bg-gray-100 border-2 border-primary/20">
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt="Profile" 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <UserCircle className="w-20 h-20 text-gray-400" />
          </div>
        )}
      </div>
      <div className="absolute -bottom-2 -right-2 p-2 rounded-full bg-primary shadow-lg hover:bg-primary/90 transition-colors">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <Save className="w-4 h-4 text-white" />
        </label>
      </div>
    </div>
    <p className="text-xs text-gray-500">Tap the icon to change photo</p>
  </div>
));

ProfileAvatar.displayName = 'ProfileAvatar';

// Form fields component
const ProfileFields = memo(({ register, errors }: any) => (
  <div className="flex-1 space-y-6">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="p-4">
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Full Name
          </label>
          <Input
            id="full_name"
            placeholder="John Doe"
            className="bg-transparent border-none shadow-none text-lg"
            {...register('full_name', { required: 'Name is required' })}
            error={errors.full_name?.message}
          />
        </div>
        
        <div className="p-4">
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Bio
          </label>
          <Textarea
            id="bio"
            placeholder="Tell us about yourself"
            rows={4}
            className="bg-transparent border-none shadow-none text-lg"
            {...register('bio')}
          />
        </div>
        
        <div className="p-4">
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Website
          </label>
          <Input
            id="website"
            type="url"
            placeholder="https://example.com"
            className="bg-transparent border-none shadow-none text-lg"
            {...register('website')}
          />
        </div>
      </div>
    </div>
  </div>
));

ProfileFields.displayName = 'ProfileFields';

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormData>();

  // Load user profile
  const loadUserProfile = useCallback(async (user: User) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, bio, website, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        reset(data);
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    if (user) {
      loadUserProfile(user);
    } else {
      navigate('/auth/login');
    }
  }, [user, loadUserProfile, navigate]);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Avatar image must be less than 2MB');
        return;
      }
      
      setAvatarFile(file);
      const objectUrl = URL.createObjectURL(file);
      setAvatarUrl(objectUrl);
      
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, []);

  const uploadAvatar = useCallback(async (userId: string): Promise<string | null> => {
    if (!avatarFile) return avatarUrl;
    
    const fileExt = avatarFile.name.split('.').pop();
    const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('user-content')
      .upload(filePath, avatarFile, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (uploadError) {
      throw uploadError;
    }
    
    const { data } = supabase.storage
      .from('user-content')
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  }, [avatarFile, avatarUrl]);

  const onSubmit = useCallback(async (formData: ProfileFormData) => {
    if (!user) {
      navigate('/auth/login');
      return;
    }
    
    try {
      setUpdating(true);
      
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        newAvatarUrl = await uploadAvatar(user.id);
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success('Profile updated successfully');
      setAvatarFile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  }, [user, avatarFile, avatarUrl, uploadAvatar, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  if (!user) {
    navigate('/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="overflow-hidden bg-white dark:bg-gray-800 shadow-xl rounded-3xl border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Profile Settings
              </h1>
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-gray-500">Loading your profile...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <ProfileAvatar 
                    avatarUrl={avatarUrl} 
                    handleAvatarChange={handleAvatarChange} 
                  />
                  <div className="md:col-span-2">
                    <ProfileFields register={register} errors={errors} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updating}
                    className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-3"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
} 