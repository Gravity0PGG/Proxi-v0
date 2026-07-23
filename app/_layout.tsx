import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import {
    getAuthState,
    loadAuthFromStorage,
    getIsProfileComplete,
    refreshProfileStatus
} from '../store/auth.store';
import { loadConversationsFromDatabase } from '../store/messaging.store';
import { initMessageDatabase } from '../services/messageDatabase';
import { initStickerDatabase } from '../services/stickerDatabase';
import { cleanupOldMediaCache } from '../services/cacheCleanup.service';
import { subscribeToUserMessages, unsubscribeFromUserMessages } from '../services/messaging.service';
import { supabase } from '../services/supabase';

export default function RootLayout() {
    const [isAuth, setIsAuth] = useState(false);
    const [isProfileComplete, setIsProfileComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const segments = useSegments();
    const router = useRouter();

    // Handle deep links (email verification callback)
    useEffect(() => {
        const handleDeepLink = async (event: { url: string }) => {
            console.log('[DeepLink] Received:', event.url);

            // Check if this is an auth callback
            if (event.url.includes('auth/callback') || event.url.includes('access_token')) {
                // Extract the fragment/hash from the URL
                const url = new URL(event.url.replace('#', '?')); // Convert fragment to query params
                const accessToken = url.searchParams.get('access_token');
                const refreshToken = url.searchParams.get('refresh_token');

                if (accessToken && refreshToken) {
                    console.log('[DeepLink] Setting session from tokens');

                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });

                    if (data.session) {
                        console.log('[DeepLink] Session established, checking profile...');
                        setIsAuth(true);

                        // Check profile completion
                        const complete = await refreshProfileStatus();
                        setIsProfileComplete(complete);

                        // Trigger global refresh
                        if ((global as any).refreshAuth) {
                            (global as any).refreshAuth();
                        }
                    } else if (error) {
                        console.error('[DeepLink] Session error:', error);
                    }
                }
            }
        };

        // Handle initial URL (app opened via deep link)
        Linking.getInitialURL().then(url => {
            if (url) {
                handleDeepLink({ url });
            }
        });

        // Listen for deep links while app is running
        const subscription = Linking.addEventListener('url', handleDeepLink);

        return () => {
            subscription.remove();
        };
    }, []);

    // Load auth from storage on app startup
    useEffect(() => {
        const initApp = async () => {
            try {
                // Initialize databases in parallel (non-blocking)
                Promise.all([
                    initMessageDatabase(),
                    initStickerDatabase()
                ]).catch(err => console.error('[App] Database init error:', err));

                // Run cache cleanup in background (non-blocking)
                cleanupOldMediaCache().catch(err =>
                    console.warn('[App] Cache cleanup error:', err)
                );

                // Load auth state from Supabase + SecureStore
                const hasAuth = await loadAuthFromStorage();
                setIsAuth(hasAuth);

                if (hasAuth) {
                    // Check if profile is complete
                    const profileComplete = getIsProfileComplete();
                    setIsProfileComplete(profileComplete);

                    // Load conversations and start message subscription
                    loadConversationsFromDatabase().catch(err =>
                        console.warn('[App] Failed to load conversations:', err)
                    );
                    subscribeToUserMessages().catch(err =>
                        console.warn('[App] Failed to start global message subscription:', err)
                    );
                }
            } catch (error) {
                console.error('[App] Init error:', error);
                setIsAuth(false);
            } finally {
                setIsLoading(false);
            }
        };

        initApp();

        // Listen for Auth Changes (Sign In, Sign Out, Token Refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[Auth] State Change: ${event}`);

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setIsAuth(true);

                // Check profile completion
                const profileComplete = await refreshProfileStatus();
                setIsProfileComplete(profileComplete);

                // Start global message subscription
                subscribeToUserMessages().catch(err =>
                    console.warn('[App] Failed to start message subscription:', err)
                );
            } else if (event === 'SIGNED_OUT') {
                setIsAuth(false);
                setIsProfileComplete(false);
                unsubscribeFromUserMessages();
            } else if (event === 'USER_UPDATED') {
                setIsAuth(true);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Handle navigation based on auth state and profile completion
    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inProfileSetup = segments[1] === 'profile-setup';

        if (!isAuth && !inAuthGroup) {
            // Not authenticated → redirect to login
            router.replace('/(auth)/login');
        } else if (isAuth && !isProfileComplete && !inProfileSetup) {
            // Authenticated but no username → redirect to profile setup
            router.replace('/(auth)/profile-setup');
        } else if (isAuth && isProfileComplete && inAuthGroup) {
            // Authenticated with complete profile → redirect to main app
            router.replace('/(tabs)/feed');
        }
    }, [isAuth, isProfileComplete, segments, isLoading]);

    // Function to refresh auth state (can be called from auth screens)
    (global as any).refreshAuth = async () => {
        const authState = getAuthState();
        setIsAuth(authState);
        if (authState) {
            const complete = await refreshProfileStatus();
            setIsProfileComplete(complete);
        } else {
            setIsProfileComplete(false);
        }
    };

    // Show loading screen while checking auth
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00D4AA" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                    name="(auth)"
                    options={{
                        // Prevent going back from profile-setup
                        gestureEnabled: isProfileComplete
                    }}
                />
                <Stack.Screen name="chat" />
                <Stack.Screen name="create" />
            </Stack>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0A0A0F',
    },
});
