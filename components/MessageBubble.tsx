import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../types/messaging.types';
import ChatImage from './ChatImage';
import CyberpunkTheme from '../constants/Colors';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
    runOnJS,
    interpolate,
    Extrapolation,
    useAnimatedReaction,
    useDerivedValue
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import ReplyLoadingIcon from './ReplyLoadingIcon';

interface MessageBubbleProps {
    item: Message;
    isSent: boolean;
    onLongPress: (message: Message, layout: { x: number, y: number, width: number, height: number, pageX: number, pageY: number }) => void;
    onImagePress: (uri: string) => void;
    isContextPlaceholder?: boolean;
    isGhost?: boolean;
    isLatest?: boolean;
    parentMessage?: Message | null;
    onReplyTap?: (messageId: string) => void;
    currentUserId?: string;
    isHighlighted?: boolean;
    searchQuery?: string;
    isCurrentMatch?: boolean;
    // Swipe Handler Props
    onSwipeReply?: (message: Message) => void;
    onSwipeStart?: () => void;
    onSwipeEnd?: () => void;
    // Grouping
    isNextSameSender?: boolean;
    isPrevSameSender?: boolean;
    // Reaction Animation
    pendingReactionAnimation?: { emoji: string; isRemoving: boolean } | null;
    onReactionAnimationComplete?: () => void;
    // Double-tap heart reaction
    onDoubleTap?: (message: Message) => void;
}

const REPLY_THRESHOLD = 50;
const MAX_DRAG = 80; // Allow a bit more drag to complete the circle comfortably

const MessageBubble = React.memo(function MessageBubble({
    item,
    isSent,
    onLongPress,
    onImagePress,
    isContextPlaceholder,
    isGhost,
    isLatest = false,
    parentMessage,
    onReplyTap,
    currentUserId,
    isHighlighted,
    searchQuery,
    isCurrentMatch,
    isNextSameSender,
    isPrevSameSender,
    onSwipeReply,
    onSwipeStart,
    onSwipeEnd,
    pendingReactionAnimation,
    onReactionAnimationComplete,
    onDoubleTap
}: MessageBubbleProps) {
    const bubbleRef = useRef<View>(null);

    // Reaction Animation
    const reactionScaleAnim = useRef(new RNAnimated.Value(1)).current;

    // --- REANIMATED VALUES ---
    const translateX = useSharedValue(0);
    const isInteracting = useSharedValue(false);
    const hasTriggeredHaptic = useSharedValue(false);

    // Flag to ensure animation only fires once per pendingReactionAnimation
    const hasAnimatedRef = useRef(false);

    // Reaction Animation Effect - only trigger once
    useEffect(() => {
        if (pendingReactionAnimation && !hasAnimatedRef.current) {
            hasAnimatedRef.current = true;

            // Stop any running animation
            reactionScaleAnim.stopAnimation();

            if (pendingReactionAnimation.isRemoving) {
                // Remove: quick shrink
                reactionScaleAnim.setValue(1);
                RNAnimated.timing(reactionScaleAnim, {
                    toValue: 0,
                    duration: 120,
                    useNativeDriver: true,
                }).start(() => {
                    reactionScaleAnim.setValue(1);
                    onReactionAnimationComplete?.();
                });
            } else {
                // Add: quick pop
                reactionScaleAnim.setValue(0);
                RNAnimated.timing(reactionScaleAnim, {
                    toValue: 1,
                    duration: 80,
                    useNativeDriver: true,
                }).start(() => {
                    onReactionAnimationComplete?.();
                });
            }
        } else if (!pendingReactionAnimation) {
            // Reset flag when animation state is cleared
            hasAnimatedRef.current = false;
        }
    }, [pendingReactionAnimation]);

    // --- GESTURE LOGIC ---
    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10]) // Don't block vertical scroll too aggressively
        .onStart(() => {
            isInteracting.value = true;
            if (onSwipeStart) runOnJS(onSwipeStart)();
        })
        .onUpdate((event) => {
            // Logic:
            // Sent (Right-aligned): Swipe Left (negative X). Clamp between -MAX and 0.
            // Received (Left-aligned): Swipe Right (positive X). Clamp between 0 and MAX.

            if (isSent) {
                // Sent: Allow dragging left
                if (event.translationX < 0) {
                    const dampening = event.translationX > -MAX_DRAG
                        ? event.translationX
                        : -MAX_DRAG - (Math.abs(event.translationX) - MAX_DRAG) * 0.1; // Logarithmic resistance
                    translateX.value = dampening;
                } else {
                    translateX.value = 0;
                }
            } else {
                // Received: Allow dragging right
                if (event.translationX > 0) {
                    const dampening = event.translationX < MAX_DRAG
                        ? event.translationX
                        : MAX_DRAG + (event.translationX - MAX_DRAG) * 0.1;
                    translateX.value = dampening;
                } else {
                    translateX.value = 0;
                }
            }
        })
        .onEnd(() => {
            isInteracting.value = false;
            const distance = Math.abs(translateX.value);

            if (distance > REPLY_THRESHOLD && onSwipeReply) {
                runOnJS(onSwipeReply)(item);
            }

            if (onSwipeEnd) runOnJS(onSwipeEnd)();

            translateX.value = withSpring(0, {
                damping: 20,
                stiffness: 150,
                mass: 0.8
            });
            hasTriggeredHaptic.value = false; // Reset haptic lock
        });

    // Double-tap gesture for heart reaction
    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (onDoubleTap && !isGhost) {
                runOnJS(onDoubleTap)(item);
            }
        });

    // Compose gestures - double tap takes priority
    const composedGestures = Gesture.Simultaneous(doubleTapGesture, panGesture);
    // --- SWIPE PROGRESS ---
    const swipeProgress = useDerivedValue(() => {
        return Math.min(Math.abs(translateX.value) / REPLY_THRESHOLD, 1);
    });

    // --- REANIMATED REACTION FOR HAPTIC & SCALE POP ---
    useAnimatedReaction(
        () => swipeProgress.value >= 1,
        (isComplete, wasComplete) => {
            if (isComplete && !wasComplete) {
                // Trigger completion haptic
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
            }
        },
        [swipeProgress]
    );


    // --- ANIMATED STYLES ---
    const rBubbleStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }]
        };
    });



    // --- ICON SLIDE ANIMATION ---
    const rIconSlideStyle = useAnimatedStyle(() => {
        const tx = translateX.value;
        const absTx = Math.abs(tx);

        // Opacity: Fade in quickly to 75% (0.75). Flash to 100% (1.0) when complete.
        // We removed opacity lag in component, so we control it here if we want fade-in.
        // User said "Opacity: Keep the 75% opacity we established."
        let opacity = interpolate(absTx, [0, 10], [0, 0.75], Extrapolation.CLAMP);
        if (absTx >= REPLY_THRESHOLD) {
            opacity = 1; // Flash to full brightness
        }

        // Slide: 
        // If Sent (Drag Left, tx < 0): Slide from Off-Screen Right (+40) to Visible (-20)
        // If Received (Drag Right, tx > 0): Slide from Off-Screen Left (-40) to Visible (20)
        const slideTranslation = isSent
            ? interpolate(tx, [0, -REPLY_THRESHOLD], [40, -20], Extrapolation.CLAMP)
            : interpolate(tx, [0, REPLY_THRESHOLD], [-40, 20], Extrapolation.CLAMP);

        return {
            opacity,
            transform: [{ translateX: slideTranslation }]
        };
    });

    // --- ORIGINAL HELPERS ---
    const renderHighlightedText = (text: string, query?: string) => {
        if (!query || !text) return <Text style={[styles.textBubbleContent, isDeleted && styles.deletedText]}>{text}</Text>;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return (
            <Text style={[styles.textBubbleContent, isDeleted && styles.deletedText]}>
                {parts.map((part, index) => (
                    part.toLowerCase() === query.toLowerCase() ? (
                        <Text key={index} style={{ backgroundColor: '#FFFF00', color: 'black' }}>{part}</Text>
                    ) : (part)
                ))}
            </Text>
        );
    };

    // --- HIGHLIGHT ANIMATION (Reanimated) ---
    const highlightProgress = useSharedValue(0);

    useEffect(() => {
        if (isHighlighted) {
            highlightProgress.value = withSequence(
                withTiming(1, { duration: 300 }),
                withTiming(0, { duration: 1000 })
            );
        }
    }, [isHighlighted]);

    const rHighlightStyle = useAnimatedStyle(() => {
        const scale = interpolate(
            highlightProgress.value,
            [0, 0.5, 1],
            [1, 1.05, 1]
        );
        return { transform: [{ scale }] };
    });


    const isText = item.type === 'text';
    const isMedia = item.type === 'image' || item.type === 'video';
    const isDeleted = item.isDeleted || !!(item as any).deleted_for?.includes(currentUserId);

    // Dynamic Corner Style for Text (Static 4px Tail as per requirement)
    // "All corners rounded 25px, except the bottom-right corner (set to 4px)"
    // --- DYNAMIC GROUPING STYLES ---
    // Note on Logic: The FlatList is effectively inverted visually (Bottom is Latest), 
    // even if not strictly `inverted={true}` prop.
    // Case B (`!prev && next`) -> Start of Chain -> Visual Bottom (Latest). Matches "First" Logic.
    // Case D (`prev && !next`) -> End of Chain -> Visual Top (Oldest). Matches "Last" Logic.

    let borderStyle = {};
    const radius = 26;
    const tailRadius = 4;

    if (!isPrevSameSender && !isNextSameSender) {
        // Case A: Single
        borderStyle = isSent
            ? { borderRadius: radius, borderBottomRightRadius: tailRadius }
            : { borderRadius: radius, borderBottomLeftRadius: tailRadius };
    } else if (!isPrevSameSender && isNextSameSender) {
        // Case B: First Message in Group (Visual Top)
        // Needs Round Top, Flat Bottom (Stitch Down)
        borderStyle = isSent
            ? {
                borderTopLeftRadius: radius, borderTopRightRadius: radius, // Round Top
                borderBottomLeftRadius: radius, borderBottomRightRadius: tailRadius // Flat Bottom
            }
            : {
                borderTopLeftRadius: radius, borderTopRightRadius: radius, // Round Top
                borderBottomRightRadius: radius, borderBottomLeftRadius: tailRadius // Flat Bottom
            };
    } else if (isPrevSameSender && isNextSameSender) {
        // Case C: Middle
        borderStyle = isSent
            ? {
                borderTopLeftRadius: radius, borderTopRightRadius: tailRadius,
                borderBottomLeftRadius: radius, borderBottomRightRadius: tailRadius
            }
            : {
                borderTopRightRadius: radius, borderTopLeftRadius: tailRadius,
                borderBottomRightRadius: radius, borderBottomLeftRadius: tailRadius
            };
    } else if (isPrevSameSender && !isNextSameSender) {
        // Case D: Last Message in Group (Visual Bottom)
        // Needs Flat Top (Stitch Up), Round Bottom
        borderStyle = isSent
            ? {
                borderTopLeftRadius: radius, borderTopRightRadius: tailRadius, // Flat Top
                borderBottomLeftRadius: radius, borderBottomRightRadius: radius // Round Bottom
            }
            : {
                borderTopRightRadius: radius, borderTopLeftRadius: tailRadius, // Flat Top
                borderBottomRightRadius: radius, borderBottomLeftRadius: radius // Round Bottom
            };
    }

    const dynamicStyle = borderStyle;

    // Margin Logic
    // Inside Group (Next is Same): 2px
    // End of Group (Next is Different/Null): 12px
    // Latest: 20px (Override)
    const marginBottom = isLatest
        ? 20
        : (isNextSameSender ? 2 : 12);

    /* Original Logic Removed */

    // Ghost Style
    const ghostMediaStyle = (isGhost && isMedia) ? {
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingHorizontal: 0,
        paddingVertical: 0,
        borderRadius: 16,
        overflow: 'hidden' as const,
    } : {};

    // Current Match Style
    const currentMatchStyle = isCurrentMatch ? {
        borderWidth: 2,
        borderColor: '#FFA500',
    } : {};



    // --- GESTURE HANDLERS ---
    const handleLongPress = () => {
        if (bubbleRef.current) {
            bubbleRef.current.measure((x, y, width, height, pageX, pageY) => {
                runOnJS(onLongPress)(item, { x, y, width, height, pageX, pageY });
            });
        }
    };

    // RENDER
    return (
        <View style={[
            styles.messageContainer,
            isSent ? styles.sentContainer : styles.receivedContainer,
            isGhost && { maxWidth: '100%', marginBottom: 0 },
            { marginBottom } // Dynamic Spacing
        ]}>

            {/* REPLY ICON (Absolute Background) */}
            {!isGhost && !isContextPlaceholder && (
                <View style={[
                    StyleSheet.absoluteFill,
                    {
                        justifyContent: 'center',
                        alignItems: isSent ? 'flex-end' : 'flex-start',
                        // paddingHorizontal: 20 // Removed to allow full edge-to-edge glide control
                    }
                ]}>
                    <Animated.View style={rIconSlideStyle}>
                        <ReplyLoadingIcon progress={swipeProgress} size={21} />
                    </Animated.View>
                </View>
            )}

            {/* SWIPEABLE CONTENT */}
            <GestureDetector gesture={composedGestures}>
                <Animated.View style={[rBubbleStyle, rHighlightStyle]}>
                    <Pressable
                        ref={bubbleRef}
                        onLongPress={handleLongPress}
                        delayLongPress={150}
                        style={({ pressed }) => ({
                            opacity: isContextPlaceholder ? 0.3 : (pressed && !isDeleted ? 0.9 : 1),
                        })}
                    >
                        {isSent ? (
                            // --- SENT MESSAGES ---
                            isText ? (
                                <RNAnimated.View style={[styles.sentTextBubble, dynamicStyle, currentMatchStyle]}>
                                    {/* Reply Header (Edge to Edge) */}
                                    {parentMessage && !isDeleted && (
                                        <Pressable
                                            onPress={() => onReplyTap?.(parentMessage.messageId)}
                                            style={({ pressed }) => [
                                                styles.replyContainer,
                                                { opacity: pressed ? 0.7 : 1 }
                                            ]}
                                        >
                                            <View style={styles.replyBar} />
                                            <View style={styles.replyContent}>
                                                <Text style={styles.replyAuthor}>
                                                    {parentMessage.senderId === currentUserId ? 'You' : 'User'}
                                                </Text>
                                                <Text numberOfLines={1} style={styles.replyText}>
                                                    {parentMessage.type === 'image' ? '📷 Photo' : parentMessage.content}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    )}

                                    {/* Content Container (Padding Applied Here) */}
                                    <View style={[styles.textContentContainer, { paddingTop: (parentMessage && !isDeleted) ? 4 : 8 }]}>
                                        {!isDeleted && item.isForwarded && (
                                            <Text style={styles.forwardedLabel}>Forwarded</Text>
                                        )}

                                        {/* Content */}
                                        <Text style={[styles.textBubbleContent, isDeleted && styles.deletedText]}>
                                            {searchQuery && !isDeleted ? (
                                                <>
                                                    {item.content.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, idx) => (
                                                        part.toLowerCase() === searchQuery.toLowerCase() ? (
                                                            <Text key={idx} style={{ backgroundColor: '#FFA500', color: 'black' }}>{part}</Text>
                                                        ) : (part)
                                                    ))}
                                                </>
                                            ) : (
                                                item.content
                                            )}
                                            {!isDeleted && (
                                                <Text style={{ fontSize: 10, color: 'transparent' }}>        00:00</Text>
                                            )}
                                        </Text>
                                        {!isDeleted && (
                                            <View style={styles.inlineTime}>
                                                <Text style={styles.timeText}>
                                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </RNAnimated.View>
                            ) : (
                                // Sent Image
                                isDeleted ? (
                                    <RNAnimated.View style={[styles.sentTextBubble, dynamicStyle]}>
                                        <Text style={[styles.textBubbleContent, styles.deletedText]}>{item.content}</Text>
                                    </RNAnimated.View>
                                ) : (
                                    <View style={[styles.sentBubble, ghostMediaStyle]}>
                                        <ChatImage
                                            uri={item.content}
                                            onPress={onImagePress}
                                            onLongPress={handleLongPress}
                                        />
                                        <View style={styles.timeContainer}>
                                            <Text style={styles.timeText}>
                                                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                    </View>
                                )
                            )
                        ) : (
                            // --- RECEIVED MESSAGES ---
                            isText || isDeleted ? (
                                <RNAnimated.View style={[styles.receivedTextBubble, dynamicStyle, currentMatchStyle]}>
                                    {parentMessage && !isDeleted && (
                                        <Pressable
                                            onPress={() => onReplyTap?.(parentMessage.messageId)}
                                            style={({ pressed }) => [
                                                styles.replyContainer,
                                                { opacity: pressed ? 0.7 : 1 }
                                            ]}
                                        >
                                            <View style={[styles.replyBar, { backgroundColor: '#ffffff' }]} />
                                            <View style={styles.replyContent}>
                                                <Text style={[styles.replyAuthor, { color: '#ffffff' }]}>
                                                    {parentMessage.senderId === item.senderId ? 'User' : 'You'}
                                                </Text>
                                                <Text numberOfLines={1} style={styles.replyText}>
                                                    {parentMessage.type === 'image' ? '📷 Photo' : parentMessage.content}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    )}

                                    <View style={[styles.textContentContainer, { paddingTop: (parentMessage && !isDeleted) ? 4 : 8 }]}>
                                        {!isDeleted && item.isForwarded && (
                                            <Text style={styles.forwardedLabel}>Forwarded</Text>
                                        )}
                                        <Text style={[styles.textBubbleContent, isDeleted && styles.deletedText]}>
                                            {searchQuery && !isDeleted ? (
                                                <>
                                                    {item.content.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, idx) => (
                                                        part.toLowerCase() === searchQuery.toLowerCase() ? (
                                                            <Text key={idx} style={{ backgroundColor: '#FFA500', color: 'black' }}>{part}</Text>
                                                        ) : (part)
                                                    ))}
                                                </>
                                            ) : (
                                                item.content
                                            )}
                                            {!isDeleted && (
                                                <Text style={{ fontSize: 10, color: 'transparent' }}>        00:00</Text>
                                            )}
                                        </Text>
                                        {!isDeleted && (
                                            <View style={styles.inlineTime}>
                                                <Text style={styles.timeText}>
                                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </RNAnimated.View>
                            ) : (
                                // Received Image
                                <BlurView
                                    intensity={isGhost ? 0 : 20}
                                    tint="light"
                                    style={[styles.receivedBubble, ghostMediaStyle]}
                                >
                                    <View style={[styles.receivedBubbleInner, ghostMediaStyle]}>
                                        <ChatImage
                                            uri={item.content}
                                            onPress={onImagePress}
                                            onLongPress={handleLongPress}
                                        />
                                    </View>
                                </BlurView>
                            )
                        )}
                    </Pressable>
                </Animated.View>
            </GestureDetector>

            {/* Edited Label */}
            {item.isEdited && !isDeleted && (
                <View style={[
                    styles.editedContainer,
                    isSent ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
                ]}>
                    <Text style={styles.editedLabel}>Edited</Text>
                </View>
            )}

            {/* Reaction Badge */}
            {item.reactions && Object.keys(item.reactions).length > 0 && !isGhost && (
                <RNAnimated.View style={[
                    styles.reactionBadge,
                    isSent ? styles.reactionBadgeSent : styles.reactionBadgeReceived,
                    { transform: [{ scale: reactionScaleAnim }] }
                ]}>
                    {Object.entries(item.reactions).map(([emoji, users]) => (
                        <Text key={emoji} style={styles.reactionEmoji}>
                            {emoji}{users.length > 1 ? ` ${users.length}` : ''}
                        </Text>
                    ))}
                </RNAnimated.View>
            )}
        </View >
    );
});

export default MessageBubble;

const styles = StyleSheet.create({
    messageContainer: {
        marginBottom: 2,
        maxWidth: '65%', // 65% Screen Width
        // Ensure container doesn't clip the reply icon or swipe movement if not needed
        // but typically overflow visible is default.
    },
    sentContainer: {
        alignSelf: 'flex-end',
    },
    receivedContainer: {
        alignSelf: 'flex-start',
    },
    // Reply Icon Style
    replyIconCircle: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Old Image Bubble Styles
    sentBubble: {
        backgroundColor: '#000000',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderBottomRightRadius: 4,
    },
    receivedBubble: {
        borderRadius: 20,
        borderWidth: 1,
        borderColor: CyberpunkTheme.primary,
        overflow: 'hidden',
    },
    receivedBubbleInner: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    // Text Bubble Styles (Pill Shape)
    sentTextBubble: {
        backgroundColor: '#262628', // Dark Gray
        // paddingHorizontal: 16, // Removed for Edge-to-Edge Reply
        // paddingVertical: 8, // Removed for Edge-to-Edge Reply
        borderRadius: 26, // Pill Shape
        borderBottomRightRadius: 4,
        overflow: 'hidden', // Ensure reply clip
    },
    receivedTextBubble: {
        backgroundColor: '#151515', // Matches Input Bar
        // paddingHorizontal: 16, // Removed for Edge-to-Edge Reply
        // paddingVertical: 8, // Removed for Edge-to-Edge Reply
        borderRadius: 26, // Pill Shape
        borderBottomLeftRadius: 4,
        borderWidth: 0.5,
        borderColor: '#333333', // Subtle border definition
        overflow: 'hidden', // Ensure reply clip
    },
    textContentContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8, // Fixed Bottom Padding
        // paddingTop is dynamic via style override
    },
    textBubbleContent: {
        color: '#FFFFFF',
        fontSize: 15, // 15px
        lineHeight: 21,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 4,
        paddingRight: 8,
    },
    timeText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
    },
    inlineTime: {
        position: 'absolute',
        bottom: 5,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    editedContainer: {
        marginTop: 2,
        marginHorizontal: 4,
    },
    editedLabel: {
        color: '#8E8E93',
        fontSize: 11,
    },
    forwardedLabel: {
        fontStyle: 'italic',
        fontSize: 11,
        color: '#8E8E93',
        marginBottom: 4,
        marginLeft: 10,
        marginTop: 6,
    },
    sentText: {
        color: '#ffffff',
        fontSize: 17,
        lineHeight: 24,
    },
    receivedText: {
        color: CyberpunkTheme.text,
        fontSize: 17,
        lineHeight: 24,
    },
    deletedText: {
        fontStyle: 'italic',
        color: '#8E8E93',
    },
    // Reply Styles
    replyContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 20, // Increased to match main bubble (26px - margin)
        padding: 8,
        marginBottom: 0, // Removed gap to content (was 4)
        marginTop: 4, // Gap to top
        marginHorizontal: 4, // Gap to sides
        overflow: 'hidden',
    },
    replyBar: {
        width: 4,
        backgroundColor: CyberpunkTheme.primary,
        borderRadius: 2,
        marginRight: 10,
        marginLeft: 2,
    },
    replyContent: {
        flex: 1,
        justifyContent: 'center',
    },
    replyAuthor: {
        color: CyberpunkTheme.primary,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    replyText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
    },
    // Reaction Badge Styles - with background box and shadow for curve effect
    reactionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(40, 40, 40, 0.95)',
        borderRadius: 10,
        paddingHorizontal: 5,
        paddingVertical: 2,
        marginTop: -4, // Tiny gap with bubble above
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        // Shadow to create "tucked under" effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    reactionBadgeSent: {
        alignSelf: 'flex-end',
        marginRight: 6,
    },
    reactionBadgeReceived: {
        alignSelf: 'flex-start',
        marginLeft: 6,
    },
    reactionEmoji: {
        fontSize: 13, // Reduced by ~20% from 16
        marginHorizontal: 1,
    }
});
