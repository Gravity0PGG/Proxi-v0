import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, Text, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, runOnJS, interpolate } from 'react-native-reanimated';
import { getTransitionStore } from '../store/transition.store';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Post } from '../types/post.types';
import { getIntelligentFeed } from '../services/feed.service';
import {
    getPostStore,
    setFeedPosts,
    setActiveTier,
    setOffset,
    setHasMore,
    setLoading,
    clearAllPosts,
    subscribe
} from '../store/post.store';
import ReelItem from './ReelItem';
import { Ionicons } from '@expo/vector-icons';



const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Tab bar height estimate (adjust if needed)
const TAB_BAR_HEIGHT = 50;
const REEL_HEIGHT = SCREEN_HEIGHT - TAB_BAR_HEIGHT;

import { getFeedStore, subscribe as subscribeFeed } from '../store/feed.store';
import { getFeedContextStore, subscribe as subscribeContext, resetToDefaultContext, setLocationContext } from '../store/feedContext.store';
import { getContentStore } from '../store/content.store';
import { requestFeedByLocation } from '../services/feedDiscovery.service';

import { setCurrentVideo } from '../store/reelsSession.store';

export default function ReelsFeed() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
    const router = useRouter();

    // Viewability Config for tracking active reel
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50
    }).current;

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            const activeItem = viewableItems[0].item as Post;
            setCurrentVideoId(activeItem.postId);
            // Report active video to session store
            setCurrentVideo(activeItem.postId);
        }
    }).current;

    const params = useLocalSearchParams();
    const [contextSource, setContextSource] = useState<'map' | 'default'>('default');
    const [activeLocation, setActiveLocation] = useState<any>(null);

    // 1. Listen to Localized Feed Context (Map interactions)
    useEffect(() => {
        const unsubContext = subscribeContext(() => {
            const context = getFeedContextStore();
            setContextSource(context.source);
            setActiveLocation(context.activeLocation);

            if (context.source === 'map' && context.activeLocation) {
                console.log('ReelsFeed: Location context detected from map. Requesting feed...');
                requestFeedByLocation({
                    lat: context.activeLocation.latitude,
                    lng: context.activeLocation.longitude,
                    radius: context.activeRadius,
                    timeWindow: context.activeTimeWindow
                });
            }
        });

        // Sync with URL params if available
        if (params.lat && params.lng) {
            const lat = parseFloat(params.lat as string);
            const lng = parseFloat(params.lng as string);
            const radius = params.radius ? parseFloat(params.radius as string) : 10000;

            setLocationContext(lat, lng, radius);
        }

        // 2. Listen to Ranked Feed State
        const unsubFeed = subscribeFeed(() => {
            const feedState = getFeedStore();
            const contentPosts = getContentStore().posts;

            // Map IDs to full Post objects
            const rankedPosts = feedState.rankedPostIds
                .map(id => contentPosts[id])
                .filter(Boolean);

            setPosts(rankedPosts);
            setIsLoading(feedState.isLoading);
        });

        // Initial Load or Check Context
        const initialContext = getFeedContextStore();
        if (initialContext.source === 'map' && initialContext.activeLocation) {
            requestFeedByLocation({
                lat: initialContext.activeLocation.latitude,
                lng: initialContext.activeLocation.longitude,
                radius: initialContext.activeRadius
            });
        }

        return () => {
            unsubContext();
            unsubFeed();
        };
    }, []);

    const handleRefresh = async () => {
        const context = getFeedContextStore();
        if (context.activeLocation) {
            await requestFeedByLocation({
                lat: context.activeLocation.latitude,
                lng: context.activeLocation.longitude,
                radius: context.activeRadius
            });
        }
    };

    const handleClearFilter = () => {
        // Trigger reverse animation before resetting
        const transition = getTransitionStore();
        transition.progress.value = withTiming(0, { duration: 600 }, (finished) => {
            if (finished) {
                runOnJS(resetToDefaultContext)();
                runOnJS(router.push)('/(tabs)/map');
            }
        });
    };

    const renderItem = ({ item }: { item: Post }) => (
        <View style={{ height: REEL_HEIGHT }}>
            <ReelItem post={item} isActive={item.postId === currentVideoId} />
        </View>
    );

    const transition = getTransitionStore();

    const animatedContentStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(transition.progress.value, [0, 0.2], [0, 1]),
            transform: [
                { scale: 0.95 + (0.05 * transition.progress.value) }
            ]
        };
    });

    return (
        <Animated.View style={[styles.container, animatedContentStyle]}>
            {/* Location Filter Badge */}
            {contextSource === 'map' && activeLocation && (
                <View style={styles.badgeContainer}>
                    <View style={styles.badge}>
                        <Ionicons name="location" size={14} color="#fff" />
                        <Text style={styles.badgeText}>Location Filter Active</Text>
                        <TouchableOpacity onPress={handleClearFilter} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            <FlatList
                data={posts}
                renderItem={renderItem}
                keyExtractor={(item) => item.postId}
                pagingEnabled={true}
                showsVerticalScrollIndicator={false}
                snapToInterval={REEL_HEIGHT}
                snapToAlignment="start"
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                refreshControl={
                    <RefreshControl
                        refreshing={!!(isLoading && posts.length === 0)}
                        onRefresh={handleRefresh}
                        tintColor="#fff"
                    />
                }
                ListFooterComponent={
                    isLoading && posts.length > 0 ? (
                        <View style={styles.footerLoader}>
                            <ActivityIndicator size="large" color="#fff" />
                        </View>
                    ) : null
                }
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    footerLoader: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeContainer: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        zIndex: 100,
        alignItems: 'center',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
        marginRight: 8,
    },
    clearButton: {
        padding: 2,
    }
});
