/**
 * Profile Service
 * Logic for profile data fetching, follow actions, and profile management
 */

import { User } from '../types/user.types';
import {
    setViewedProfile,
    setProfilePosts,
    updateCurrentUserProfile,
    getProfileStore
} from '../store/profile.store';
import { getCurrentUser, setCurrentUser } from '../store/auth.store';
import { getPostsByUserId } from './post.service';
import { followUser, unfollowUser } from './social.service';
import { supabase } from './supabase';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Fetch and set all data required for a profile view
 */
export async function loadProfileData(userId: string) {
    // 1. Fetch posts by this user
    const posts = getPostsByUserId(userId);
    setProfilePosts(posts);

    // 2. Fetch user profile from Supabase
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (profile && !error) {
        const user: User = {
            id: userId,
            profileId: userId,
            username: profile.username,
            displayName: profile.display_name || '',
            profilePhotoUrl: profile.avatar_url || '',
            avatarUrl: profile.avatar_url || '',
            bio: profile.bio || '',
            createdAt: new Date(profile.created_at).getTime(),
            joinedAt: new Date(profile.created_at).getTime(),
            isPrivate: false,
            isVerified: profile.is_verified || false,
            followerCount: profile.follower_count || 0,
            followingCount: profile.following_count || 0,
            postsCount: posts.length
        };
        setViewedProfile(user);
    }

    return { posts };
}

/**
 * Check if a username is available
 */
export async function checkUsernameAvailable(username: string): Promise<{ available: boolean; error?: string }> {
    try {
        if (!username || username.length < 3 || username.length > 30) {
            return { available: false, error: 'Invalid username length' };
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username.toLowerCase())
            .maybeSingle();

        if (error) {
            console.error('[ProfileService] Username check error:', error);
            return { available: false, error: 'Could not verify username' };
        }

        return { available: data === null };
    } catch (e: any) {
        console.error('[ProfileService] Username check exception:', e);
        return { available: false, error: e.message || 'Network error' };
    }
}

/**
 * Update user profile in Supabase
 */
export async function updateProfile(
    userId: string,
    updates: {
        username?: string;
        displayName?: string;
        bio?: string;
        avatarUrl?: string;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabaseUpdates: any = {
            updated_at: new Date().toISOString()
        };

        if (updates.username !== undefined) {
            supabaseUpdates.username = updates.username.toLowerCase();
        }
        if (updates.displayName !== undefined) {
            supabaseUpdates.display_name = updates.displayName;
        }
        if (updates.bio !== undefined) {
            supabaseUpdates.bio = updates.bio;
        }
        if (updates.avatarUrl !== undefined) {
            supabaseUpdates.avatar_url = updates.avatarUrl;
        }

        const { error } = await supabase
            .from('profiles')
            .update(supabaseUpdates)
            .eq('id', userId);

        if (error) {
            console.error('[ProfileService] Update error:', error);
            return { success: false, error: error.message };
        }

        // Update local state
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            await setCurrentUser({
                ...currentUser,
                username: updates.username ?? currentUser.username,
                displayName: updates.displayName ?? currentUser.displayName,
                bio: updates.bio ?? currentUser.bio,
                profilePhotoUrl: updates.avatarUrl ?? currentUser.profilePhotoUrl,
                avatarUrl: updates.avatarUrl ?? currentUser.avatarUrl
            });
        }

        return { success: true };
    } catch (e: any) {
        console.error('[ProfileService] Update exception:', e);
        return { success: false, error: e.message || 'Update failed' };
    }
}

/**
 * Upload and compress avatar image to Supabase Storage
 */
export async function uploadAvatar(
    userId: string,
    imageUri: string
): Promise<{ url: string | null; error?: string }> {
    try {
        // Compress image to 800x800, 70% quality
        const compressed = await manipulateAsync(
            imageUri,
            [{ resize: { width: 800, height: 800 } }],
            { compress: 0.7, format: SaveFormat.JPEG }
        );

        // Fetch blob
        const response = await fetch(compressed.uri);
        const blob = await response.blob();

        const fileName = `${userId}-${Date.now()}.jpg`;
        const filePath = `avatars/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filePath, blob, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (error) {
            console.error('[ProfileService] Upload error:', error);
            return { url: null, error: error.message };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return { url: urlData.publicUrl };
    } catch (e: any) {
        console.error('[ProfileService] Upload exception:', e);
        return { url: null, error: e.message || 'Upload failed' };
    }
}

/**
 * Follow a user and update local profile counts
 */
export async function followUserAction(targetId: string) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    await followUser(currentUser.id, targetId);

    const store = getProfileStore();
    if (store.viewedProfile && store.viewedProfile.id === targetId) {
        setViewedProfile({
            ...store.viewedProfile,
            followerCount: store.viewedProfile.followerCount + 1
        });
    }

    if (store.currentUserProfile) {
        updateCurrentUserProfile({
            followingCount: store.currentUserProfile.followingCount + 1
        });
    }
}

/**
 * Unfollow a user and update local profile counts
 */
export async function unfollowUserAction(targetId: string) {
    await unfollowUser(targetId);

    const store = getProfileStore();
    if (store.viewedProfile && store.viewedProfile.id === targetId) {
        setViewedProfile({
            ...store.viewedProfile,
            followerCount: Math.max(0, store.viewedProfile.followerCount - 1)
        });
    }

    if (store.currentUserProfile) {
        updateCurrentUserProfile({
            followingCount: Math.max(0, store.currentUserProfile.followingCount - 1)
        });
    }
}

/**
 * Update current user profile (local only, for quick UI updates)
 */
export function saveProfileEdits(updates: { displayName?: string, bio?: string, avatarUrl?: string }) {
    updateCurrentUserProfile(updates);
    console.log('[ProfileService] Profile updated locally:', updates);
}

/**
 * Fetch profile by username
 */
export async function getProfileByUsername(username: string): Promise<User | null> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username.toLowerCase())
            .single();

        if (error || !data) {
            return null;
        }

        return {
            id: data.id,
            profileId: data.id,
            username: data.username,
            displayName: data.display_name || '',
            profilePhotoUrl: data.avatar_url || '',
            avatarUrl: data.avatar_url || '',
            bio: data.bio || '',
            createdAt: new Date(data.created_at).getTime(),
            joinedAt: new Date(data.created_at).getTime(),
            isPrivate: false,
            isVerified: data.is_verified || false,
            followerCount: data.follower_count || 0,
            followingCount: data.following_count || 0,
            postsCount: data.posts_count || 0
        };
    } catch (e) {
        console.error('[ProfileService] Get by username error:', e);
        return null;
    }
}
