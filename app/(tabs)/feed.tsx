import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Text, Animated } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ReelItem from '../../components/ReelItem';
import { Post } from '../../types/post.types';
import { getFeedStore } from '../../store/feed.store';
import { getContentStore } from '../../store/content.store';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const REEL_HEIGHT = SCREEN_HEIGHT - 85;

export default function FeedScreen() {
    const params = useLocalSearchParams();
    const [posts, setPosts] = useState<Post[]>([]);
    const [activePostId, setActivePostId] = useState<string | null>(null);

    // Fade Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Track previous coordinates to prevent duplicate logs
    const prevCoords = useRef({ lat: '', lng: '' });

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50
    }).current;

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setActivePostId(viewableItems[0].item.postId);
        }
    }).current;

    // FIXED: Use strict dependencies [params.lat, params.lng] instead of [params]
    useEffect(() => {
        // Only log if coordinates actually changed
        const currentLat = params.lat as string;
        const currentLng = params.lng as string;

        if (currentLat && currentLng) {
            if (prevCoords.current.lat !== currentLat || prevCoords.current.lng !== currentLng) {
                console.log('Feed received coordinates:', currentLat, currentLng);
                prevCoords.current = { lat: currentLat, lng: currentLng };
            }
        }

        // Fetch Logic
        const feedState = getFeedStore();
        const contentPosts = getContentStore().posts;

        let loadedPosts = feedState.rankedPostIds
            .map(id => contentPosts[id])
            .filter(Boolean);

        setPosts(loadedPosts);

        if (loadedPosts.length > 0) {
            setActivePostId(loadedPosts[0].postId);
        }

        // Trigger Fade-In (only once per coordinate change)
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();

    }, [params.lat, params.lng]); // FIXED: Strict primitive dependencies

    const renderItem = ({ item }: { item: Post }) => (
        <View style={{ height: REEL_HEIGHT }}>
            <ReelItem post={item} isActive={item.postId === activePostId} />
        </View>
    );

    return (
        <View style={styles.blackBackground}>
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                {posts.length === 0 ? (
                    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: 'white' }}>No reels found</Text>
                        {params.lat && params.lng && (
                            <Text style={{ color: 'gray', fontSize: 10, marginTop: 10 }}>
                                Lat: {params.lat}, Lng: {params.lng}
                            </Text>
                        )}
                    </View>
                ) : (
                    <FlatList
                        data={posts}
                        renderItem={renderItem}
                        keyExtractor={item => item.postId}
                        pagingEnabled
                        showsVerticalScrollIndicator={false}
                        viewabilityConfig={viewabilityConfig}
                        onViewableItemsChanged={onViewableItemsChanged}
                        decelerationRate="fast"
                        snapToInterval={REEL_HEIGHT}
                        snapToAlignment="start"
                    />
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    blackBackground: {
        flex: 1,
        backgroundColor: '#000',
    },
    container: {
        flex: 1,
    },
});
