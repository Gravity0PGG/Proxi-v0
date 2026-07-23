import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';
import { getCurrentUser, setCurrentUser, setProfileComplete } from '../../store/auth.store';
import CyberpunkTheme from '../../constants/Colors';

// Username validation regex: alphanumeric, dots, underscores
const USERNAME_REGEX = /^[a-zA-Z0-9._]+$/;
const DEBOUNCE_MS = 300;

export default function ProfileSetupScreen() {
    const router = useRouter();

    // Session state - get directly from Supabase for reliability
    const [userId, setUserId] = useState<string | null>(null);
    const [isSessionLoading, setIsSessionLoading] = useState(true);

    // Form state
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // UI state
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get session on mount and listen for changes
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
                console.log('[ProfileSetup] Session user ID:', session.user.id);
            } else {
                console.warn('[ProfileSetup] No session found');
            }
            setIsSessionLoading(false);
        };

        getSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[ProfileSetup] Auth state change:', event);
            if (session?.user) {
                setUserId(session.user.id);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Username validation with debounce
    useEffect(() => {
        if (!username) {
            setIsUsernameAvailable(null);
            setUsernameError(null);
            return;
        }

        // Validate format first
        if (username.length < 3) {
            setUsernameError('Username must be at least 3 characters');
            setIsUsernameAvailable(null);
            return;
        }
        if (username.length > 30) {
            setUsernameError('Username must be 30 characters or less');
            setIsUsernameAvailable(null);
            return;
        }
        if (!USERNAME_REGEX.test(username)) {
            setUsernameError('Only letters, numbers, dots, and underscores allowed');
            setIsUsernameAvailable(null);
            return;
        }

        setUsernameError(null);
        setIsCheckingUsername(true);

        const timer = setTimeout(async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', username.toLowerCase())
                    .maybeSingle();

                if (error) {
                    console.error('[ProfileSetup] Username check error:', error);
                    setUsernameError('Could not verify username');
                    setIsUsernameAvailable(null);
                } else {
                    setIsUsernameAvailable(data === null);
                    if (data !== null) {
                        setUsernameError('Username is already taken');
                    }
                }
            } catch (e) {
                console.error('[ProfileSetup] Username check exception:', e);
                setUsernameError('Network error');
            } finally {
                setIsCheckingUsername(false);
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [username]);

    // Pick and compress profile image
    const handlePickImage = async () => {
        // Ensure we have a valid session
        if (!userId) {
            // Try to get session again
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                Alert.alert('Session Error', 'Please wait for your session to be established');
                return;
            }
            setUserId(session.user.id);
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (!result.canceled && result.assets[0]) {
                setIsUploading(true);
                const uri = result.assets[0].uri;

                // Compress image to 800x800, 70% quality
                const compressed = await manipulateAsync(
                    uri,
                    [{ resize: { width: 800, height: 800 } }],
                    { compress: 0.7, format: SaveFormat.JPEG }
                );

                setAvatarUri(compressed.uri);

                // Upload to Supabase Storage
                const uploadedUrl = await uploadImage(compressed.uri);
                if (uploadedUrl) {
                    setAvatarUrl(uploadedUrl);
                }

                setIsUploading(false);
            }
        } catch (e: any) {
            console.error('[ProfileSetup] Image pick error:', e);
            Alert.alert('Error', 'Failed to pick image');
            setIsUploading(false);
        }
    };

    // Upload image to Supabase Storage
    const uploadImage = async (imageUri: string): Promise<string | null> => {
        try {
            // Get fresh session to ensure we're authenticated
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                throw new Error('Session not found. Please try again.');
            }

            const currentUserId = session.user.id;
            console.log('[ProfileSetup] Uploading image for user:', currentUserId);
            console.log('[ProfileSetup] Image URI:', imageUri);

            // 1. Fetch the image data and convert to ArrayBuffer (blob doesn't work in RN)
            const response = await fetch(imageUri);
            const arrayBuffer = await response.arrayBuffer();
            console.log('[ProfileSetup] ArrayBuffer size:', arrayBuffer.byteLength, 'bytes');

            if (arrayBuffer.byteLength === 0) {
                throw new Error('ArrayBuffer is empty - image fetch failed');
            }

            // 2. Extract the file extension
            const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${currentUserId}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            console.log('[ProfileSetup] File name:', fileName);

            // 3. Upload the ArrayBuffer with correct content type
            const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
            console.log('[ProfileSetup] Content type:', contentType);

            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, arrayBuffer, {
                    contentType,
                    upsert: true
                });

            if (error) {
                console.error('[ProfileSetup] Upload error:', error);
                throw error;
            }

            console.log('[ProfileSetup] Upload success, data:', data);

            // Use public URL (bucket must be public in Supabase dashboard)
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            console.log('[ProfileSetup] Public URL:', urlData.publicUrl);
            return urlData.publicUrl;
        } catch (e: any) {
            console.error('[ProfileSetup] Upload exception:', e);
            Alert.alert('Upload Error', e.message || 'Failed to upload image');
            return null;
        }
    };

    // Check if form is valid
    const isFormValid = () => {
        return (
            username.length >= 3 &&
            username.length <= 30 &&
            USERNAME_REGEX.test(username) &&
            isUsernameAvailable === true &&
            displayName.trim().length > 0 &&
            displayName.trim().length <= 50
        );
    };

    // Submit profile
    const handleFinalize = async () => {
        if (!isFormValid()) return;

        // Get fresh user to ensure we are actually authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (!user || userError) {
            setError('Authentication error. If you just signed up, please check your email for a verification link, completely close the app, and log in again.');
            setIsSubmitting(false);
            return;
        }

        const currentUserId = user.id;
        const currentEmail = user.email || '';

        setIsSubmitting(true);
        setError(null);

        try {
            const updates = {
                username: username.toLowerCase(),
                display_name: displayName.trim(),
                bio: bio.trim(),
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            };

            const { error: updateError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', currentUserId);

            if (updateError) {
                throw updateError;
            }

            // Update local auth store
            await setCurrentUser({
                id: currentUserId,
                profileId: currentUserId,
                email: currentEmail,
                username: username.toLowerCase(),
                displayName: displayName.trim(),
                bio: bio.trim(),
                profilePhotoUrl: avatarUrl || '',
                avatarUrl: avatarUrl || '',
                createdAt: Date.now(),
                joinedAt: Date.now(),
                isPrivate: false,
                isVerified: false,
                followerCount: 0,
                followingCount: 0,
                postsCount: 0
            });

            await setProfileComplete(true);

            // Trigger navigation guard refresh
            if ((globalThis as any).refreshAuth) {
                (globalThis as any).refreshAuth();
            }

            // Navigate to main app
            router.replace('/(tabs)/feed');

        } catch (e: any) {
            console.error('[ProfileSetup] Finalize error:', e);
            setError(e.message || 'Failed to save profile');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.innerContainer}>
                    <Text style={styles.title}>Complete Your Profile</Text>
                    <Text style={styles.subtitle}>Choose a username to get started</Text>

                    {/* Avatar Picker */}
                    <TouchableOpacity
                        style={styles.avatarContainer}
                        onPress={handlePickImage}
                        disabled={isUploading}
                    >
                        {avatarUri ? (
                            <Image
                                source={{ uri: avatarUri }}
                                style={styles.avatar}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="camera" size={40} color={CyberpunkTheme.textSecondary} />
                            </View>
                        )}
                        {isUploading && (
                            <View style={styles.avatarOverlay}>
                                <ActivityIndicator color={CyberpunkTheme.primary} />
                            </View>
                        )}
                        <View style={styles.avatarBadge}>
                            <Ionicons name="add" size={20} color="#000" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.avatarHint}>Tap to add a profile photo</Text>

                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* Username Field */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Username *</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputPrefix}>@</Text>
                            <TextInput
                                style={styles.inputWithPrefix}
                                placeholder="username"
                                placeholderTextColor={CyberpunkTheme.textSecondary}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={30}
                            />
                            {isCheckingUsername && (
                                <ActivityIndicator size="small" color={CyberpunkTheme.primary} style={styles.inputIcon} />
                            )}
                            {!isCheckingUsername && isUsernameAvailable === true && (
                                <Ionicons name="checkmark-circle" size={24} color="#34C759" style={styles.inputIcon} />
                            )}
                            {!isCheckingUsername && isUsernameAvailable === false && (
                                <Ionicons name="close-circle" size={24} color="#FF3B30" style={styles.inputIcon} />
                            )}
                        </View>
                        {usernameError && (
                            <Text style={styles.fieldError}>{usernameError}</Text>
                        )}
                        <Text style={styles.fieldHint}>3-30 characters. Letters, numbers, dots, underscores.</Text>
                    </View>

                    {/* Display Name Field */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Display Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="What should we call you?"
                            placeholderTextColor={CyberpunkTheme.textSecondary}
                            value={displayName}
                            onChangeText={setDisplayName}
                            maxLength={50}
                            textContentType="nickname"
                            importantForAutofill="no"
                            autoCorrect={false}
                        />
                        <Text style={styles.fieldCounter}>{displayName.length}/50</Text>
                    </View>

                    {/* Bio Field */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.bioInput]}
                            placeholder="Tell us about yourself..."
                            placeholderTextColor={CyberpunkTheme.textSecondary}
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            maxLength={150}
                            textAlignVertical="top"
                        />
                        <Text style={styles.fieldCounter}>{bio.length}/150</Text>
                    </View>

                    {/* Finalize Button */}
                    <TouchableOpacity
                        style={[
                            styles.button,
                            (!isFormValid() || isSubmitting) && styles.buttonDisabled
                        ]}
                        onPress={handleFinalize}
                        disabled={!isFormValid() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.buttonText}>Complete Setup</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CyberpunkTheme.background,
    },
    scrollContent: {
        flexGrow: 1,
    },
    innerContainer: {
        flex: 1,
        alignItems: 'center',
        padding: 24,
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: CyberpunkTheme.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: CyberpunkTheme.textSecondary,
        marginBottom: 32,
        textAlign: 'center',
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 8,
        position: 'relative',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: CyberpunkTheme.primary,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: CyberpunkTheme.surface,
        borderWidth: 2,
        borderColor: CyberpunkTheme.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarOverlay: {
        ...StyleSheet.absoluteFill,
        borderRadius: 60,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: CyberpunkTheme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: CyberpunkTheme.background,
    },
    avatarHint: {
        fontSize: 14,
        color: CyberpunkTheme.textSecondary,
        marginBottom: 32,
    },
    fieldContainer: {
        width: '100%',
        marginBottom: 20,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: CyberpunkTheme.text,
        marginBottom: 8,
    },
    input: {
        width: '100%',
        height: 56,
        backgroundColor: CyberpunkTheme.surface,
        borderWidth: 1,
        borderColor: CyberpunkTheme.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: CyberpunkTheme.text,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CyberpunkTheme.surface,
        borderWidth: 1,
        borderColor: CyberpunkTheme.border,
        borderRadius: 12,
        height: 56,
    },
    inputPrefix: {
        fontSize: 16,
        color: CyberpunkTheme.textSecondary,
        paddingLeft: 16,
    },
    inputWithPrefix: {
        flex: 1,
        height: 56,
        fontSize: 16,
        color: CyberpunkTheme.text,
        paddingHorizontal: 8,
    },
    inputIcon: {
        marginRight: 12,
    },
    bioInput: {
        height: 100,
        paddingTop: 12,
        paddingBottom: 12,
    },
    fieldHint: {
        fontSize: 12,
        color: CyberpunkTheme.textSecondary,
        marginTop: 4,
    },
    fieldError: {
        fontSize: 12,
        color: '#FF3B30',
        marginTop: 4,
    },
    fieldCounter: {
        fontSize: 12,
        color: CyberpunkTheme.textSecondary,
        marginTop: 4,
        textAlign: 'right',
    },
    button: {
        width: '100%',
        height: 56,
        backgroundColor: CyberpunkTheme.primary,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '600',
    },
    errorContainer: {
        width: '100%',
        backgroundColor: 'rgba(255, 59, 48, 0.15)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        textAlign: 'center',
    },
});
