/**
 * Edit Profile Screen - Modal for editing profile information
 */

import React, { useState, useEffect } from 'react';
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
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import CyberpunkTheme from '../constants/Colors';

export default function EditProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Form state
    const [userId, setUserId] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [originalData, setOriginalData] = useState<any>(null);

    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load current profile data
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    Alert.alert('Error', 'Session not found');
                    router.back();
                    return;
                }

                setUserId(session.user.id);

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error('[EditProfile] Fetch error:', error);
                    Alert.alert('Error', 'Failed to load profile');
                    router.back();
                    return;
                }

                setUsername(data.username || '');
                setDisplayName(data.display_name || '');
                setBio(data.bio || '');
                setAvatarUrl(data.avatar_url);
                setAvatarUri(data.avatar_url);
                setOriginalData(data);
            } catch (e) {
                console.error('[EditProfile] Load error:', e);
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, []);

    // Pick and compress profile image
    const handlePickImage = async () => {
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

                // Compress image
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
            console.error('[EditProfile] Image pick error:', e);
            Alert.alert('Error', 'Failed to pick image');
            setIsUploading(false);
        }
    };

    // Upload image to Supabase Storage
    const uploadImage = async (imageUri: string): Promise<string | null> => {
        try {
            if (!userId) return null;

            console.log('[EditProfile] Starting upload for user:', userId);
            console.log('[EditProfile] Image URI:', imageUri);

            // 1. Fetch the image data and convert to ArrayBuffer (blob doesn't work in RN)
            const response = await fetch(imageUri);
            const arrayBuffer = await response.arrayBuffer();
            console.log('[EditProfile] ArrayBuffer size:', arrayBuffer.byteLength, 'bytes');

            if (arrayBuffer.byteLength === 0) {
                throw new Error('ArrayBuffer is empty - image fetch failed');
            }

            // 2. Extract the file extension
            const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${userId}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            console.log('[EditProfile] File name:', fileName);

            // 3. Upload the ArrayBuffer with correct content type
            const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
            console.log('[EditProfile] Content type:', contentType);

            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, arrayBuffer, {
                    contentType,
                    upsert: true
                });

            if (error) {
                console.error('[EditProfile] Upload error:', error);
                throw error;
            }

            console.log('[EditProfile] Upload success, data:', data);

            // Use public URL (bucket must be public in Supabase dashboard)
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            console.log('[EditProfile] Public URL:', urlData.publicUrl);
            return urlData.publicUrl;
        } catch (e: any) {
            console.error('[EditProfile] Upload exception:', e);
            Alert.alert('Upload Error', e.message || 'Failed to upload image');
            return null;
        }
    };

    // Save profile changes
    const handleSave = async () => {
        if (!userId) return;
        if (!displayName.trim()) {
            Alert.alert('Error', 'Display name is required');
            return;
        }

        setIsSaving(true);

        try {
            const updates = {
                display_name: displayName.trim(),
                bio: bio.trim(),
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId);

            if (error) {
                throw error;
            }

            // Go back to profile
            router.back();
        } catch (e: any) {
            console.error('[EditProfile] Save error:', e);
            Alert.alert('Error', e.message || 'Failed to save profile');
        } finally {
            setIsSaving(false);
        }
    };

    // Check if there are unsaved changes
    const hasChanges = () => {
        if (!originalData) return false;
        return (
            displayName !== (originalData.display_name || '') ||
            bio !== (originalData.bio || '') ||
            avatarUrl !== originalData.avatar_url
        );
    };

    // Handle close
    const handleClose = () => {
        if (hasChanges()) {
            Alert.alert(
                'Discard Changes?',
                'You have unsaved changes. Are you sure you want to discard them?',
                [
                    { text: 'Keep Editing', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: () => router.back() }
                ]
            );
        } else {
            router.back();
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={CyberpunkTheme.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={handleClose}>
                    <Ionicons name="close" size={28} color={CyberpunkTheme.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSaving || !hasChanges()}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color={CyberpunkTheme.primary} />
                    ) : (
                        <Text style={[
                            styles.saveButton,
                            (!hasChanges()) && styles.saveButtonDisabled
                        ]}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
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
                            <Ionicons name="person" size={50} color={CyberpunkTheme.textSecondary} />
                        </View>
                    )}
                    {isUploading && (
                        <View style={styles.avatarOverlay}>
                            <ActivityIndicator color={CyberpunkTheme.primary} />
                        </View>
                    )}
                    <View style={styles.avatarBadge}>
                        <Ionicons name="camera" size={16} color="#000" />
                    </View>
                </TouchableOpacity>
                <Text style={styles.changePhotoText}>Change Photo</Text>

                {/* Username (read-only) */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Username</Text>
                    <View style={styles.readOnlyField}>
                        <Text style={styles.readOnlyText}>@{username}</Text>
                        <Ionicons name="lock-closed-outline" size={16} color={CyberpunkTheme.textSecondary} />
                    </View>
                    <Text style={styles.fieldHint}>Username cannot be changed</Text>
                </View>

                {/* Display Name */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Display Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Your name"
                        placeholderTextColor={CyberpunkTheme.textSecondary}
                        value={displayName}
                        onChangeText={setDisplayName}
                        maxLength={50}
                    />
                    <Text style={styles.fieldCounter}>{displayName.length}/50</Text>
                </View>

                {/* Bio */}
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
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CyberpunkTheme.background,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: CyberpunkTheme.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: CyberpunkTheme.text,
    },
    saveButton: {
        fontSize: 16,
        fontWeight: '600',
        color: CyberpunkTheme.primary,
    },
    saveButtonDisabled: {
        color: CyberpunkTheme.textSecondary,
    },
    scrollContent: {
        padding: 24,
        alignItems: 'center',
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: CyberpunkTheme.primary,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: CyberpunkTheme.surface,
        borderWidth: 2,
        borderColor: CyberpunkTheme.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: CyberpunkTheme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: CyberpunkTheme.background,
    },
    changePhotoText: {
        fontSize: 14,
        color: CyberpunkTheme.primary,
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 32,
    },
    fieldContainer: {
        width: '100%',
        marginBottom: 24,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: CyberpunkTheme.text,
        marginBottom: 8,
    },
    input: {
        width: '100%',
        height: 52,
        backgroundColor: CyberpunkTheme.surface,
        borderWidth: 1,
        borderColor: CyberpunkTheme.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: CyberpunkTheme.text,
    },
    bioInput: {
        height: 100,
        paddingTop: 14,
        paddingBottom: 14,
    },
    readOnlyField: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 52,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: CyberpunkTheme.border,
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    readOnlyText: {
        fontSize: 16,
        color: CyberpunkTheme.textSecondary,
    },
    fieldHint: {
        fontSize: 12,
        color: CyberpunkTheme.textSecondary,
        marginTop: 4,
    },
    fieldCounter: {
        fontSize: 12,
        color: CyberpunkTheme.textSecondary,
        marginTop: 4,
        textAlign: 'right',
    },
});
