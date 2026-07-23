/**
 * User Service
 * Foundation layer for user profile management
 */

import { User } from '../types/user.types';
import { setCachedUser, setCachedUsers } from '../store/user.store';
import { supabase } from './supabase';

/**
 * Fetch a user profile by ID from Supabase
 */
export async function getUserProfile(userId: string): Promise<User | null> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
            console.error('[UserService] Profile fetch error:', error);
            return null;
        }

        const user: User = {
            id: data.id,
            profileId: data.id,
            username: data.username,
            displayName: data.display_name || '',
            profilePhotoUrl: data.avatar_url || '',
            avatarUrl: data.avatar_url || '',
            bio: data.bio || '',
            createdAt: new Date(data.created_at).getTime(),
            joinedAt: new Date(data.created_at).getTime(),
            isPrivate: data.is_private || false,
            isVerified: data.is_verified || false,
            followerCount: data.follower_count || 0,
            followingCount: data.following_count || 0,
            postsCount: data.posts_count || 0,
        };

        setCachedUser(user);
        return user;
    } catch (e) {
        console.error('[UserService] Exception:', e);
        return null;
    }
}

/**
 * Batch fetch users from Supabase
 */
export async function getBatchProfiles(userIds: string[]): Promise<User[]> {
    if (userIds.length === 0) return [];

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);

        if (error || !data) {
            console.error('[UserService] Batch fetch error:', error);
            return [];
        }

        const users: User[] = data.map(profile => ({
            id: profile.id,
            profileId: profile.id,
            username: profile.username,
            displayName: profile.display_name || '',
            profilePhotoUrl: profile.avatar_url || '',
            avatarUrl: profile.avatar_url || '',
            bio: profile.bio || '',
            createdAt: new Date(profile.created_at).getTime(),
            joinedAt: new Date(profile.created_at).getTime(),
            isPrivate: profile.is_private || false,
            isVerified: profile.is_verified || false,
            followerCount: profile.follower_count || 0,
            followingCount: profile.following_count || 0,
            postsCount: profile.posts_count || 0,
        }));

        setCachedUsers(users);
        return users;
    } catch (e) {
        console.error('[UserService] Batch exception:', e);
        return [];
    }
}
