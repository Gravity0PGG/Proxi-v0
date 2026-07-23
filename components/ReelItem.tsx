import React from 'react';
import { useIsFocused } from 'expo-router';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Post } from '../types/post.types';
import { Ionicons } from '@expo/vector-icons';
import { reportWatchTime, reportReplay } from '../services/reelsSession.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReelItemProps {
    post: Post;
    isActive: boolean;
}

export default function ReelItem({ post, isActive }: ReelItemProps) {
    const [watchProgress, setWatchProgress] = React.useState(0);
    const lastReportedPercent = React.useRef(-1); // Track last integer percent
    const isFocused = useIsFocused();

    const player = useVideoPlayer(post.mediaUrl, (p) => {
        p.loop = true;
    });

    // Reset percentage when video changes
    React.useEffect(() => {
        setWatchProgress(0);
        lastReportedPercent.current = -1;
    }, [post.postId]);

    React.useEffect(() => {
        if (!player) return;
        if (isActive && isFocused) {
            player.play();
        } else {
            player.pause();
        }
    }, [isActive, isFocused, player]);

    React.useEffect(() => {
        if (!player) return;

        const timeSub = player.addListener('timeUpdate', (event) => {
            if (player.duration > 0) {
                const percentage = (event.currentTime / player.duration) * 100;
                const integerPercent = Math.floor(percentage);

                if (integerPercent !== lastReportedPercent.current) {
                    lastReportedPercent.current = integerPercent;
                    setWatchProgress(percentage);
                    reportWatchTime(post.postId, event.currentTime * 1000, player.duration);
                }
            }
        });

        const replaySub = player.addListener('playToEnd', () => {
            reportReplay(post.postId);
        });

        return () => {
            timeSub.remove();
            replaySub.remove();
        };
    }, [player, post.postId]);

    return (
        <View style={styles.container}>
            {/* Video Player */}
            <VideoView
                player={player}
                style={styles.media}
                contentFit="cover"
                nativeControls={false}
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
