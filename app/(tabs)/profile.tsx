/**
 * Profile Dashboard - Instagram-style with Supabase integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Dimensions,
    RefreshControl,
    Share,
    Alert,
    Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { supabase } from '../../services/supabase';
import { logout } from '../../store/auth.store';
import CyberpunkTheme from '../../constants/Colors';
import ProfileSettingsSheet from '../../components/ProfileSettingsSheet';
import SkeletonGridItem from '../../components/SkeletonGridItem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH / 3;
const ITEM_HEIGHT = COLUMN_WIDTH * (4 / 3); // 3:4 aspect ratio

// Tab types
type ContentTab = 'grid' | 'reels' | 'tagged';

// Content item type
interface ContentItem {
    id: string;
    mediaUrl: string;
    type: 'image' | 'video';
    createdAt: string;
}

// Profile data type
interface ProfileData {
    id: string;
    username: string | null;
    displayName: string;
    bio: string;
    avatarUrl: string | null;
    isPrivate: boolean;
    followerCount: number;
    followingCount: number;
    postsCount: number;
    signupNumber: number | null; // User's signup order based on created_at
}

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Profile state
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Content state
    const [activeTab, setActiveTab] = useState<ContentTab>('grid');
    const [content, setContent] = useState<ContentItem[]>([]);
    const [isLoadingContent, setIsLoadingContent] = useState(true);

    // Settings sheet state
    const [showSettings, setShowSettings] = useState(false);

    // Fetch profile data from Supabase
    const fetchProfile = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                console.warn('[Profile] No session');
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) {
                console.error('[Profile] Fetch error:', error);
                return;
            }

            // Debug logging
            console.log('[Profile] Fetched data:', {
                id: data.id,
                username: data.username,
                avatar_url: data.avatar_url,
                display_name: data.display_name,
            });

            const avatarUrl = data.avatar_url || null;
            console.log('[Profile] Avatar URL:', avatarUrl);

            // Fetch user's signup number (rank based on created_at)
            let signupNumber: number | null = null;
            try {
                const { count, error: countError } = await supabase
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .lte('created_at', data.created_at);

                if (!countError && count !== null) {
                    signupNumber = count;
                    console.log('[Profile] Signup number:', signupNumber);
                }
            } catch (rankError) {
                console.error('[Profile] Signup number fetch error:', rankError);
            }

            setProfile({
                id: data.id,
                username: data.username,
                displayName: data.display_name || '',
                bio: data.bio || '',
                avatarUrl: avatarUrl,
                isPrivate: data.is_private || false,
                followerCount: data.follower_count || 0,
                followingCount: data.following_count || 0,
                postsCount: data.posts_count || 0,
                signupNumber: signupNumber,
            });
        } catch (e) {
            console.error('[Profile] Exception:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch content based on active tab
    const fetchContent = useCallback(async () => {
        setIsLoadingContent(true);
        try {
            // TODO: Fetch real content from Supabase
            // For now, return empty array to show empty state
            await new Promise(resolve => setTimeout(resolve, 300));
            setContent([]);
        } catch (e) {
            console.error('[Profile] Content fetch error:', e);
        } finally {
            setIsLoadingContent(false);
        }
    }, [activeTab]);

    // Initial load
    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // Fetch content when tab changes
    useEffect(() => {
        fetchContent();
    }, [activeTab, fetchContent]);

    // Pull to refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([fetchProfile(), fetchContent()]);
        setIsRefreshing(false);
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/(auth)/login');
        } catch (e) {
            console.error('[Profile] Logout error:', e);
        }
    };

    // Handle share profile
    const handleShareProfile = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                message: `Check out @${profile?.username || 'user'} on PROXI!\nproxi://profile/${profile?.username}`,
                url: `proxi://profile/${profile?.username}`,
            });
        } catch (e) {
            console.error('[Profile] Share error:', e);
        }
    };

    // Handle edit profile
    const handleEditProfile = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/edit-profile');
    };

    // Handle privacy toggle
    const handlePrivacyToggle = async (isPrivate: boolean) => {
        if (!profile) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_private: isPrivate })
                .eq('id', profile.id);

            if (!error) {
                setProfile({ ...profile, isPrivate });
            }
        } catch (e) {
            console.error('[Profile] Privacy toggle error:', e);
        }
    };

    // Handle stat press
    const handleStatPress = (stat: 'posts' | 'followers' | 'following') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // TODO: Navigate to list view
        Alert.alert(stat.charAt(0).toUpperCase() + stat.slice(1), 'List view coming soon!');
    };

    // Format number for display
    const formatCount = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
        return num.toString();
    };

    // Render header
    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Top Bar */}
            <View style={[styles.topBar, { paddingTop: insets.top }]}>
                {/* Empty spacer for balance */}
                <View style={styles.topBarSpacer} />

                {/* Centered username */}
                <Text style={styles.usernameTitle}>
                    @{profile?.username || 'loading...'}
                </Text>

                {/* Settings button */}
                <TouchableOpacity
                    style={styles.topBarSpacer}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowSettings(true);
                    }}
                >
                    <Ionicons name="menu-outline" size={28} color={CyberpunkTheme.text} />
                </TouchableOpacity>
            </View>

            {/* Profile Info Row */}
            <View style={styles.profileRow}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    {profile?.avatarUrl && profile.avatarUrl.length > 0 ? (
                        <RNImage
                            source={{ uri: profile.avatarUrl }}
                            style={styles.avatar}
                            resizeMode="cover"
                            onError={(e) => console.error('[Profile] Avatar load error:', e.nativeEvent.error)}
                            onLoad={() => console.log('[Profile] Avatar loaded successfully')}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={40} color={CyberpunkTheme.textSecondary} />
                        </View>
                    )}
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <TouchableOpacity
                        style={styles.statItem}
                        onPress={() => handleStatPress('posts')}
                    >
                        <Text style={styles.statNumber}>{formatCount(profile?.postsCount || 0)}</Text>
                        <Text style={styles.statLabel}>Posts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.statItem}
                        onPress={() => handleStatPress('followers')}
                    >
                        <Text style={styles.statNumber}>{formatCount(profile?.followerCount || 0)}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.statItem}
                        onPress={() => handleStatPress('following')}
                    >
                        <Text style={styles.statNumber}>{formatCount(profile?.followingCount || 0)}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Bio Section */}
            <View style={styles.bioContainer}>
                <View style={styles.displayNameRow}>
                    <Text style={styles.displayName}>{profile?.displayName || ''}</Text>
                    {profile?.signupNumber && (
                        <TouchableOpacity
                            style={styles.signupBadge}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                const displayName = profile.displayName || profile.username || 'This user';
                                Alert.alert(
                                    '🎖️ Early Adopter',
                                    `${displayName} was the #${profile.signupNumber} person to join PROXI!`,
                                    [{ text: 'Cool!', style: 'default' }]
                                );
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.signupBadgeText}>#{profile.signupNumber}</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {profile?.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
                    <Text style={styles.actionButtonText}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleShareProfile}>
                    <Ionicons name="share-outline" size={18} color={CyberpunkTheme.text} />
                </TouchableOpacity>
            </View>

            {/* Content Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'grid' && styles.activeTab]}
                    onPress={() => setActiveTab('grid')}
                >
                    <Ionicons
                        name="grid-outline"
                        size={24}
                        color={activeTab === 'grid' ? CyberpunkTheme.primary : CyberpunkTheme.textSecondary}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'reels' && styles.activeTab]}
                    onPress={() => setActiveTab('reels')}
                >
                    <Ionicons
                        name="play-circle-outline"
                        size={24}
                        color={activeTab === 'reels' ? CyberpunkTheme.primary : CyberpunkTheme.textSecondary}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'tagged' && styles.activeTab]}
                    onPress={() => setActiveTab('tagged')}
                >
                    <Ionicons
                        name="bookmark-outline"
                        size={24}
                        color={activeTab === 'tagged' ? CyberpunkTheme.primary : CyberpunkTheme.textSecondary}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );

    // Render grid item
    const renderGridItem = ({ item, index }: { item: ContentItem; index: number }) => (
        <TouchableOpacity
            style={styles.gridItem}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // TODO: Navigate to content detail
            }}
        >
            <Image
                source={{ uri: item.mediaUrl }}
                style={styles.gridImage}
                contentFit="cover"
                transition={200}
            />
            {item.type === 'video' && (
                <View style={styles.videoIcon}>
                    <Ionicons name="play" size={14} color="#fff" />
                </View>
            )}
        </TouchableOpacity>
    );

    // Render skeleton loaders
    const renderSkeletons = () => (
        <View style={styles.skeletonContainer}>
            {Array.from({ length: 9 }).map((_, i) => (
                <SkeletonGridItem key={i} index={i} />
            ))}
        </View>
    );

    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons
                name={
                    activeTab === 'grid' ? 'images-outline' :
                        activeTab === 'reels' ? 'videocam-outline' :
                            'bookmark-outline'
                }
                size={60}
                color={CyberpunkTheme.primary}
            />
            <Text style={styles.emptyTitle}>
                {activeTab === 'grid' ? 'No Posts Yet' :
                    activeTab === 'reels' ? 'No Reels Yet' :
                        'No Saved Items'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {activeTab === 'grid' ? 'Share your first post!' :
                    activeTab === 'reels' ? 'Create your first reel!' :
                        'Save posts to see them here'}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <FlatList
                data={isLoadingContent ? [] : content}
                renderItem={renderGridItem}
                keyExtractor={(item) => item.id}
                numColumns={3}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={isLoadingContent ? renderSkeletons : renderEmptyState}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.flatListContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={CyberpunkTheme.primary}
                    />
                }
            />

            {/* Settings Bottom Sheet */}
            <ProfileSettingsSheet
                visible={showSettings}
                onClose={() => setShowSettings(false)}
                onLogout={handleLogout}
                onSavedItems={() => {
                    setShowSettings(false);
                    setActiveTab('tagged');
                }}
                isPrivate={profile?.isPrivate || false}
                onPrivacyToggle={handlePrivacyToggle}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CyberpunkTheme.background,
    },
    flatListContent: {
        paddingBottom: 100,
    },
    headerContainer: {
        backgroundColor: CyberpunkTheme.background,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    topBarSpacer: {
        width: 40,
        alignItems: 'flex-end',
    },
    usernameTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: CyberpunkTheme.text,
        textAlign: 'center',
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    avatarContainer: {
        marginRight: 24,
    },
    avatar: {
        width: 86,
        height: 86,
        borderRadius: 43,
        borderWidth: 2,
        borderColor: CyberpunkTheme.primary,
    },
    avatarPlaceholder: {
        width: 86,
        height: 86,
        borderRadius: 43,
        backgroundColor: CyberpunkTheme.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: CyberpunkTheme.border,
    },
    statsContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: CyberpunkTheme.text,
    },
    statLabel: {
        fontSize: 13,
        color: CyberpunkTheme.textSecondary,
        marginTop: 2,
    },
    bioContainer: {
        paddingHorizontal: 16,
        marginTop: 16,
    },
    displayNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    displayName: {
        fontSize: 15,
        fontWeight: '600',
        color: CyberpunkTheme.text,
    },
    signupBadge: {
        backgroundColor: CyberpunkTheme.primary,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        shadowColor: CyberpunkTheme.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 4,
    },
    signupBadgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#000',
        letterSpacing: 0.5,
    },
    bioText: {
        fontSize: 14,
        color: CyberpunkTheme.text,
        lineHeight: 20,
        marginTop: 4,
    },
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginTop: 16,
        gap: 8,
    },
    actionButton: {
        flex: 1,
        backgroundColor: CyberpunkTheme.surface,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: CyberpunkTheme.border,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: CyberpunkTheme.text,
    },
    tabsContainer: {
        flexDirection: 'row',
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: CyberpunkTheme.border,
        borderBottomWidth: 1,
        borderBottomColor: CyberpunkTheme.border,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: CyberpunkTheme.primary,
    },
    gridItem: {
        width: COLUMN_WIDTH,
        height: ITEM_HEIGHT,
        padding: 1,
    },
    gridImage: {
        width: '100%',
        height: '100%',
        borderRadius: 2,
    },
    videoIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 4,
        borderRadius: 4,
    },
    skeletonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: CyberpunkTheme.primary,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: CyberpunkTheme.primary,
        opacity: 0.8,
        marginTop: 8,
        textAlign: 'center',
    },
});
