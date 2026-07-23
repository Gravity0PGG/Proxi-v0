/**
 * Auth Store
 * Manages authentication state with Supabase + SecureStore persistence
 */

import * as SecureStore from 'expo-secure-store';
import { User } from '../types/user.types';
import { supabase } from '../services/supabase';

// Storage Keys
const USER_KEY = 'auth_user';
const PROFILE_COMPLETE_KEY = 'profile_complete';

// In-memory state
let isAuthenticated = false;
let currentUser: User | null = null;
let isProfileComplete = false;

// ============================================================================
// GETTERS
// ============================================================================

export const getAuthState = (): boolean => {
    return Boolean(isAuthenticated);
};

export const getCurrentUser = (): User | null => {
    return currentUser;
};

export const getIsProfileComplete = (): boolean => {
    return isProfileComplete;
};

// ============================================================================
// SETTERS
// ============================================================================

/**
 * Set current user (called after fetching profile from Supabase)
 */
export const setCurrentUser = async (user: User | null): Promise<void> => {
    currentUser = user;
    if (user) {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } else {
        await SecureStore.deleteItemAsync(USER_KEY);
    }
};

/**
 * Set profile complete status
 */
export const setProfileComplete = async (complete: boolean): Promise<void> => {
    isProfileComplete = complete;
    await SecureStore.setItemAsync(PROFILE_COMPLETE_KEY, complete ? 'true' : 'false');
};

// ============================================================================
// AUTH ACTIONS
// ============================================================================

/**
 * Login with Supabase
 */
export const loginWithSupabase = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('[Auth] Login error:', error.message);
            return { success: false, error: error.message };
        }

        if (data.user) {
            isAuthenticated = true;

            // Fetch profile to check if username exists
            const profileComplete = await checkAndLoadProfile(data.user.id, data.user.email || '');

            return { success: true };
        }

        return { success: false, error: 'No user data returned' };
    } catch (e: any) {
        console.error('[Auth] Login exception:', e);
        return { success: false, error: e.message || 'Login failed' };
    }
};

/**
 * Signup with Supabase
 */
export const signupWithSupabase = async (email: string, password: string): Promise<{ success: boolean; error?: string; needsEmailVerification?: boolean }> => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                // Deep link back to app after email verification
                emailRedirectTo: 'proxi://auth/callback'
            }
        });

        if (error) {
            console.error('[Auth] Signup error:', error.message);
            return { success: false, error: error.message };
        }

        if (data.user) {
            // If session exists, user is fully logged in immediately (email verification is disabled)
            if (data.session) {
                isAuthenticated = true;
            }

            // Create empty profile row (username = null triggers profile setup)
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    username: null,
                    display_name: '',
                    bio: '',
                    avatar_url: null,
                    created_at: new Date().toISOString()
                });

            if (profileError) {
                console.error('[Auth] Profile creation error:', profileError);
                // Don't fail signup, profile can be created later
            }

            // Set profile as incomplete (no username)
            if (data.session) {
                await setProfileComplete(false);
            }

            // Create minimal user object
            currentUser = {
                id: data.user.id,
                profileId: data.user.id,
                email: data.user.email || email,
                username: null,
                displayName: '',
                profilePhotoUrl: '',
                bio: '',
                createdAt: Date.now(),
                joinedAt: Date.now(),
                isPrivate: false,
                isVerified: false,
                followerCount: 0,
                followingCount: 0,
                postsCount: 0
            };
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(currentUser));

            return { success: true, needsEmailVerification: !data.session };
        }

        return { success: false, error: 'No user data returned' };
    } catch (e: any) {
        console.error('[Auth] Signup exception:', e);
        return { success: false, error: e.message || 'Signup failed' };
    }
};

/**
 * Logout
 */
export const logout = async (): Promise<void> => {
    try {
        await supabase.auth.signOut();
        await SecureStore.deleteItemAsync(USER_KEY);
        await SecureStore.deleteItemAsync(PROFILE_COMPLETE_KEY);
        currentUser = null;
        isAuthenticated = false;
        isProfileComplete = false;
    } catch (error) {
        console.error('[Auth] Logout error:', error);
    }
};

// ============================================================================
// PROFILE HELPERS
// ============================================================================

/**
 * Check if profile has username and load profile data
 */
export const checkAndLoadProfile = async (userId: string, email: string): Promise<boolean> => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            console.error('[Auth] Profile fetch error:', error);
        }

        if (profile) {
            const hasUsername = profile.username && profile.username.length > 0;
            await setProfileComplete(hasUsername);

            currentUser = {
                id: userId,
                profileId: userId,
                email: email,
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
                postsCount: profile.posts_count || 0
            };
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(currentUser));

            return hasUsername;
        } else {
            // No profile exists, create one
            await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    username: null,
                    display_name: '',
                    bio: '',
                    avatar_url: null,
                    created_at: new Date().toISOString()
                });

            await setProfileComplete(false);
            return false;
        }
    } catch (e) {
        console.error('[Auth] Profile check error:', e);
        return false;
    }
};

// ============================================================================
// STARTUP
// ============================================================================

/**
 * Load auth from storage on app startup
 */
export const loadAuthFromStorage = async (): Promise<boolean> => {
    try {
        // Check Supabase session first
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
            isAuthenticated = true;

            // Load profile complete status from storage first (fast)
            const storedComplete = await SecureStore.getItemAsync(PROFILE_COMPLETE_KEY);
            isProfileComplete = storedComplete === 'true';

            // Load cached user
            const storedUser = await SecureStore.getItemAsync(USER_KEY);
            if (storedUser) {
                try {
                    currentUser = JSON.parse(storedUser);
                } catch (e) {
                    console.warn('[Auth] Failed to parse stored user');
                }
            }

            // Refresh profile from Supabase (async, non-blocking for UI)
            checkAndLoadProfile(session.user.id, session.user.email || '').catch(err => {
                console.warn('[Auth] Background profile refresh failed:', err);
            });

            return true;
        } else {
            // No session, clear everything
            isAuthenticated = false;
            isProfileComplete = false;
            currentUser = null;
            return false;
        }
    } catch (error) {
        console.error('[Auth] Load error:', error);
        isAuthenticated = false;
        return false;
    }
};

/**
 * Force refresh profile complete status from Supabase
 */
export const refreshProfileStatus = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        return await checkAndLoadProfile(session.user.id, session.user.email || '');
    }
    return false;
};
