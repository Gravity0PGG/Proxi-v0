import React from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Post } from '../types/post.types';
import { Ionicons } from '@expo/vector-icons';
import { reportWatchTime, reportReplay } from '../services/reelsSession.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReelItemProps {
    post: Post;
    isActive: boolean;
}

export default function ReelItem({ post, isActive }: ReelItemProps) {
    const videoRef = React.useRef<Video>(null);
    const [watchProgress, setWatchProgress] = React.useState(0);
    const lastReportedPercent = React.useRef(-1); // Track last integer percent
    const isFocused = useIsFocused();

    // Reset percentage when video changes
    React.useEffect(() => {
        setWatchProgress(0);
        lastReportedPercent.current = -1;
    }, [post.postId]);

    const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;

        if (status.durationMillis && status.durationMillis > 0) {
            // Calculate percentage
            const percentage = (status.positionMillis / status.durationMillis) * 100;
            const integerPercent = Math.floor(percentage);

            // OPTIMIZATION: Only update state if integer value changed
            if (integerPercent !== lastReportedPercent.current) {
                lastReportedPercent.current = integerPercent;
                setWatchProgress(percentage);

                // Sync with session store
                reportWatchTime(post.postId, status.positionMillis, status.durationMillis / 1000);
            }
        }

        if (status.didJustFinish) {
            handleReplay();
        }
    };

    React.useEffect(() => {
        if (isActive && isFocused) {
            videoRef.current?.playAsync();
        } else {
            videoRef.current?.pauseAsync();
        }
    }, [isActive, isFocused]);

    const handleReplay = () => {
        reportReplay(post.postId);
    };

    return (
        <View style={styles.container}>
            {/* Video Player */}
            <Video
                ref={videoRef}
                source={{ uri: post.mediaUrl }}
                style={styles.media}
                resizeMode={ResizeMode.COVER}
                isLooping
                shouldPlay={isActive && isFocused}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            />

            {/* Progress Bar at Bottom */}
            <View style={styles.progressBarContainer}>
                <View
                    style={[
                        styles.progressBarFill,
                        { width: `${watchProgress}%` }
                    ]}
                />
            </View>

            {/* Overlay Layers */}
            <View style={styles.overlay}>
                {/* Bottom Content (Caption, User) */}
                <View style={styles.bottomContent}>
                    <Text style={styles.username}>@{post.creatorId}</Text>
                    {post.caption && (
                        <Text style={styles.caption} numberOfLines={2}>
                            {post.caption}
                        </Text>
                    )}
                    <View style={styles.locationContainer}>
                        <Ionicons name="location" size={12} color="#fff" />
                        <Text style={styles.locationText}>
                            {post.location.city || post.location.geohash.substring(0, 7)}
                        </Text>
                    </View>
                </View>

                {/* Right Actions (Likes, Comments, Shares, Saves) */}
                <View style={styles.rightActions}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="heart" size={32} color="#fff" />
                        <Text style={styles.actionText}>{post.likesCount}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="chatbubble" size={30} color="#fff" />
                        <Text style={styles.actionText}>{post.commentsCount}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="bookmark" size={30} color="#fff" />
                        <Text style={styles.actionText}>{post.savesCount}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="share-social" size={30} color="#fff" />
                        <Text style={styles.actionText}>{post.sharesCount}</Text>
                    </TouchableOpacity>

                    {/* Real-time Watch Percentage Badge */}
                    <View style={styles.watchBadge}>
                        <Text style={styles.watchText}>{watchProgress.toFixed(1)}%</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    media: {
        ...StyleSheet.absoluteFill,
        width: SCREEN_WIDTH,
    },
    progressBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
        zIndex: 100,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#fff',
    },
    overlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'flex-end',
        padding: 16,
        paddingBottom: 40,
    },
    bottomContent: {
        width: '80%',
    },
    username: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    caption: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    locationText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    rightActions: {
        position: 'absolute',
        right: 12,
        bottom: 80,
        alignItems: 'center',
    },
    actionButton: {
        alignItems: 'center',
        marginBottom: 20,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    watchBadge: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    watchText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'monospace',
    }
});
