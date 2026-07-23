import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableWithoutFeedback,
    Animated,
    Dimensions,
    TouchableOpacity,
    Platform,
    Keyboard,
    ScrollView,
    TextInput,
    FlatList
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Message } from '../types/messaging.types';
import { POPULAR_EMOJIS } from '../constants/emojis';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChatContextOverlayProps {
    visible: boolean;
    message: Message | null;
    layout: { x: number; y: number; width: number; height: number; pageX: number; pageY: number } | null;
    onDismiss: () => void;
    renderMessageGhost: (message: Message) => React.ReactNode;
    onAction: (action: string, message: Message) => void;
    headerHeight: number;
    currentUserId: string; // Required for alignment logic
}

export default function ChatContextOverlay({
    visible,
    message,
    layout,
    onDismiss,
    renderMessageGhost,
    onAction,
    headerHeight,
    currentUserId
}: ChatContextOverlayProps) {
    const insets = useSafeAreaInsets();
    const anim = useRef(new Animated.Value(0)).current;
    // Fade in the overlay entry (since we lost Modal's fade)
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const emojiAnim = useRef(new Animated.Value(0)).current;
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Falling Emoji Animation State
    const [fallingEmoji, setFallingEmoji] = useState<{
        emoji: string;
        startX: number;
        startY: number;
        isRemoving?: boolean;
    } | null>(null);
    const fallAnim = useRef(new Animated.Value(0)).current;

    // Emoji Picker Panel State
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const emojiPickerAnim = useRef(new Animated.Value(0)).current;

    // Filter emojis based on search query (MOVED UP to avoid Hook Error)
    const filteredEmojis = React.useMemo(() => {
        if (!searchQuery.trim()) return POPULAR_EMOJIS;

        const query = searchQuery.toLowerCase();
        // Create a flat "Search Results" category

        // Helper to check keywords
        const checkKeywords = (keywords: string[], q: string) => keywords.some(k => k.includes(q));

        const searchResults = POPULAR_EMOJIS.flatMap(cat => cat.emojis)
            .filter(emoji =>
                emoji.char === query || checkKeywords(emoji.keywords, query)
            );

        // Return as a single category for display
        return [{
            id: 'search',
            name: 'Search Results',
            icon: '🔍',
            emojis: searchResults
        }];
    }, [searchQuery]);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
        const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    useEffect(() => {
        if (visible && layout) {
            // Reset to default state (emoji bar + context menu visible, picker closed)
            setShowEmojiPicker(false);
            setSearchQuery('');
            emojiPickerAnim.setValue(0);

            // Trigger Haptics immediately at start ("Pop" effect)
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            Animated.parallel([
                Animated.spring(anim, {
                    toValue: 1,
                    useNativeDriver: true,
                    // Snappy Apple-style Physics
                    damping: 20,
                    stiffness: 150,
                    mass: 0.8,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true
                }),
                Animated.timing(emojiAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            anim.setValue(0);
            fadeAnim.setValue(0);
            emojiAnim.setValue(0);
        }
    }, [visible, layout]);

    if (!visible || !message || !layout) return null;

    // --- Coordinate System Adjustment ---
    // The overlay is positioned at `top: headerHeight`.
    // So (0,0) in Overlay is (0, headerHeight) on Screen.
    // We must adjust the message's standard `pageY` to be relative to the Overlay.
    const relativePageY = layout.pageY - headerHeight;

    // --- Top Safe & Scaled Logic ---

    // Dynamic Height: 1 item (~60px) vs Full Menu (~280px)
    const MENU_HEIGHT = message.isDeleted ? 60 : 280;
    const MENU_MARGIN = 8;
    const EMOJI_BAR_HEIGHT = 48; // Pill Height
    const EMOJI_BAR_WIDTH = 312; // Increased width for better spacing (6 items + button)
    const EMOJI_BAR_MARGIN = 8;

    const BOTTOM_BUFFER = 40;
    // Top Limit relative to overlay: Ensure space for Emoji Bar + 20px padding
    const TOP_LIMIT = 20 + EMOJI_BAR_HEIGHT + EMOJI_BAR_MARGIN;
    const MENU_WIDTH = 250;
    const HORIZONTAL_SCREEN_PADDING = 16;

    // Effective Screen Bottom relative to overlay
    // Screen Height - Header Height - Keyboard
    const INPUT_AREA_HEIGHT = 60; // Reduced to bring menu closer to input
    const overlayHeight = SCREEN_HEIGHT - headerHeight;
    const effectiveOverlayBottom = overlayHeight - keyboardHeight;

    // The "Chat Limit": Visible area stops at Input Bar Top if keyboard is closed.
    // If keyboard is open, Input Bar sits on top of keyboard.
    const maxAllowedY = effectiveOverlayBottom - (keyboardHeight > 0 ? 0 : INPUT_AREA_HEIGHT) - insets.bottom;

    const availableHeight = maxAllowedY - TOP_LIMIT;

    // 2. Calculate Scale (Fit Check)
    const requiredTotalHeight = layout.height + MENU_MARGIN + MENU_HEIGHT;

    let scale = 1;
    if (requiredTotalHeight > availableHeight) {
        const maxMessageHeight = availableHeight - MENU_MARGIN - MENU_HEIGHT;
        scale = maxMessageHeight / layout.height;
    }

    const scaledMessageHeight = layout.height * scale;

    // 3. Determine Final Y Position (Relative to Overlay)
    let targetY = relativePageY;

    // A. Top Check (Nudge Down to avoid overlapping Header)
    if (targetY < TOP_LIMIT) {
        targetY = TOP_LIMIT;
    }

    // B. Bottom Check (Fit Menu)
    const proposedMenuBottom = targetY + scaledMessageHeight + MENU_MARGIN + MENU_HEIGHT;

    if (proposedMenuBottom > maxAllowedY) {
        const shiftUp = proposedMenuBottom - maxAllowedY;
        targetY -= shiftUp;
        if (targetY < TOP_LIMIT) {
            targetY = TOP_LIMIT;
        }
    }

    // 4. Calculate Transforms
    // Center-to-Center delta
    const startCY = relativePageY + (layout.height / 2);
    const targetCY = targetY + (scaledMessageHeight / 2);
    const deltaY = targetCY - startCY;

    const translateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, deltaY]
    });

    const scaleAnim = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, scale]
    });

    // 5. Menu and Emoji Bar Positioning
    const isReply = !!message.parentId && !message.isDeleted;
    const REPLY_OFFSET = isReply ? 20 : 0;

    // Minimum top position for emoji bar (10px padding from overlay top)
    const MIN_EMOJI_BAR_TOP = 10;

    // Calculate bottom limit for menu (must not exceed this)
    const MAX_MENU_BOTTOM = maxAllowedY;

    // --- SHIFT DOWN (Top Edge Case) ---
    // Check if there's room ABOVE the ghost message for emoji bar
    const emojiBarTopAbove = relativePageY - EMOJI_BAR_MARGIN - EMOJI_BAR_HEIGHT;
    const emojiBarAboveIsValid = emojiBarTopAbove >= MIN_EMOJI_BAR_TOP;

    let shiftDown = 0;
    if (!emojiBarAboveIsValid) {
        shiftDown = MIN_EMOJI_BAR_TOP - emojiBarTopAbove;
    }

    // --- SHIFT UP (Bottom Edge Case) ---
    // Calculate where menu would end up after shift-down
    const tentativeMessageTop = relativePageY + shiftDown;
    const tentativeMenuTop = tentativeMessageTop + layout.height + MENU_MARGIN + REPLY_OFFSET;
    const tentativeMenuBottom = tentativeMenuTop + MENU_HEIGHT;

    let shiftUp = 0;
    if (tentativeMenuBottom > MAX_MENU_BOTTOM) {
        shiftUp = tentativeMenuBottom - MAX_MENU_BOTTOM;
    }

    // Apply combined shift (shiftDown is positive, shiftUp is subtracted)
    const totalShift = shiftDown - shiftUp;
    const adjustedMessageTop = relativePageY + totalShift;
    const emojiBarTop = adjustedMessageTop - EMOJI_BAR_MARGIN - EMOJI_BAR_HEIGHT;
    const menuTop = adjustedMessageTop + layout.height + MENU_MARGIN + REPLY_OFFSET;

    const baseMenuOpacity = anim.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [0, 1, 1]
    });

    const hideMenuOpacity = emojiPickerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0]
    });

    const menuOpacity = Animated.multiply(baseMenuOpacity, hideMenuOpacity);
    const menuTranslateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [10, 0]
    });

    const handleAction = (action: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onAction(action, message);
        onDismiss();
    };

    const menuItems = message.isDeleted ? [
        { icon: 'trash-outline', label: 'Delete for Me', action: 'delete_local', color: '#ff4444' }
    ] : [
        { icon: 'copy-outline', label: 'Copy', action: 'copy' },
        { icon: 'arrow-undo-outline', label: 'Reply', action: 'reply' },
        { icon: 'pencil-outline', label: 'Edit', action: 'edit' },
        { icon: 'arrow-redo-outline', label: 'Forward', action: 'forward' },
        { icon: 'language-outline', label: 'Translate', action: 'translate' },
        { icon: 'trash-outline', label: 'Delete', action: 'delete', color: '#ff4444' },
    ];

    // Horizontal Positioning: Edge Alignment with Context Menu
    // Received -> Left Edge Aligns with Menu Left
    // Sent -> Right Edge Aligns with Menu Right

    // Note: `menuLeft` is calculated below (lines ~160+), but we need it here.
    // Solution: Move menu logic UP or calculate it here. 
    // Since menu logic depends on layout and SCREEN_WIDTH, we can duplicate it or move it.
    // Let's Move the Menu Logic UP before Emoji Logic.

    // --- MOVED MENU LOGIC START ---
    const isSent = message.senderId === currentUserId;
    let menuLeft: number;

    if (isSent) {
        menuLeft = (layout.pageX + layout.width) - MENU_WIDTH;
        if (menuLeft + MENU_WIDTH > SCREEN_WIDTH - HORIZONTAL_SCREEN_PADDING) menuLeft = SCREEN_WIDTH - HORIZONTAL_SCREEN_PADDING - MENU_WIDTH;
        if (menuLeft < HORIZONTAL_SCREEN_PADDING) menuLeft = HORIZONTAL_SCREEN_PADDING;
    } else {
        menuLeft = layout.pageX;
        if (menuLeft < HORIZONTAL_SCREEN_PADDING) menuLeft = HORIZONTAL_SCREEN_PADDING;
        if (menuLeft + MENU_WIDTH > SCREEN_WIDTH - HORIZONTAL_SCREEN_PADDING) menuLeft = SCREEN_WIDTH - HORIZONTAL_SCREEN_PADDING - MENU_WIDTH;
    }
    // --- MOVED MENU LOGIC END ---

    let emojiBarLeft: number;
    if (isSent) {
        // Right Edge Aligns: EmojiRight = MenuRight
        // EmojiLeft + EmojiWidth = MenuLeft + MenuWidth
        emojiBarLeft = (menuLeft + MENU_WIDTH) - EMOJI_BAR_WIDTH;
    } else {
        // Left Edge Aligns
        emojiBarLeft = menuLeft;
    }

    // Spring Animation for Emoji Bar (Slightly faster/stiffer)



    const emojiScale = emojiAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1] // No scale animation for buttery smoothness
    });

    const emojiTranslateY = emojiAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [8, 0] // Subtle slide up
    });

    const reactionEmojis = ['❤️', '😂', '😮', '😢', '😡', '👍'];



    // Toggle emoji picker
    const toggleEmojiPicker = () => {
        if (showEmojiPicker) {
            // Close picker
            Animated.timing(emojiPickerAnim, {
                toValue: 0,
                duration: 100, // Faster close
                useNativeDriver: true,
            }).start(() => setShowEmojiPicker(false));
        } else {
            // Open picker
            setShowEmojiPicker(true);
            Animated.spring(emojiPickerAnim, {
                toValue: 1,
                damping: 25,
                stiffness: 400, // Much snappier (was 150)
                mass: 0.8,      // Lighter feel
                useNativeDriver: true,
            }).start();
        }
    };

    // Handle emoji selection from picker
    const handlePickerEmojiSelect = (emoji: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onAction(`reaction:${emoji}`, message);
        onDismiss();
    };

    // Calculate target position for falling emoji (bottom-right of message bubble)
    // Note: isSent is already defined above in the menu logic section
    const reactionTargetX = isSent
        ? layout.pageX + layout.width - 20 // Right side of sent bubble
        : layout.pageX + 20; // Left side of received bubble
    const reactionTargetY = adjustedMessageTop + layout.height - 10; // Bottom of bubble


    const handleEmojiPress = (emoji: string, event: any) => {
        // Animation now handled by MessageBubble after overlay dismisses
        // Just trigger haptic and action, then dismiss
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onAction(`reaction:${emoji}`, message);
        onDismiss();
    };

    const handleReaction = (emoji: string) => {
        handleAction(`reaction:${emoji}`);
    };

    return (
        // Replaced Modal with Absolute View
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                {
                    top: headerHeight, // Offset by header height
                    zIndex: 900,       // Below Header (1000)
                    opacity: fadeAnim  // Fade in entire overlay
                }
            ]}
        >
            <TouchableWithoutFeedback onPress={onDismiss}>
                <View style={StyleSheet.absoluteFill}>
                    <BlurView
                        intensity={30}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                    />
                </View>
            </TouchableWithoutFeedback>

            {/* Ghost Message - Shifts Down if Needed */}
            <Animated.View
                style={{
                    position: 'absolute',
                    top: adjustedMessageTop,
                    left: layout.pageX,
                    zIndex: 90,
                    opacity: fadeAnim,
                }}
                pointerEvents="none"
            >
                {renderMessageGhost(message)}
            </Animated.View>

            {/* Emoji Reaction Bar */}
            {!message.isDeleted && (
                <Animated.View
                    style={[
                        styles.emojiBarContainer,
                        {
                            top: emojiBarTop,
                            left: emojiBarLeft,
                            width: EMOJI_BAR_WIDTH,
                            opacity: baseMenuOpacity,
                            transform: [
                                { translateY: emojiTranslateY }, // Slide Up
                                { scale: emojiScale }
                            ],
                            zIndex: 110
                        }
                    ]}
                >
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.emojiRow}>
                        {reactionEmojis.map((emoji) => (
                            <TouchableOpacity
                                key={emoji}
                                onPress={(event) => handleEmojiPress(emoji, event)}
                                style={styles.emojiItem}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.emojiText}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                        {/* Plus Button */}
                        <TouchableOpacity
                            onPress={toggleEmojiPicker}
                            style={styles.plusButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={showEmojiPicker ? "close" : "add"} size={20} color="#8E8E93" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}

            {/* Emoji Picker Panel (Instagram-style) */}
            <Animated.View
                pointerEvents={showEmojiPicker ? 'auto' : 'none'}
                style={[
                    styles.emojiPickerContainer,
                    {
                        top: emojiBarTop + 50, // Below the emoji bar
                        left: 12,
                        right: 12,
                        opacity: emojiPickerAnim,
                        transform: [
                            {
                                scale: emojiPickerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.9, 1]
                                })
                            },
                            {
                                translateY: emojiPickerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-10, 0]
                                })
                            }
                        ],
                        zIndex: 115
                    }
                ]}
            >
                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search emoji"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                    )}
                </View>



                {/* Emoji Grid - Using FlatList for proper scroll bounds */}
                <FlatList
                    data={filteredEmojis.flatMap(cat => cat.emojis)}
                    keyExtractor={(item) => item.char}
                    numColumns={8}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                    overScrollMode="never"
                    style={styles.emojiGrid}
                    contentContainerStyle={{ paddingBottom: 8 }}
                    initialNumToRender={40}
                    maxToRenderPerBatch={40}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    getItemLayout={(data, index) => {
                        const width = SCREEN_WIDTH - 40; // 24 (margin) + 16 (padding)
                        const itemSize = width / 8;
                        return { length: itemSize, offset: itemSize * Math.floor(index / 8), index };
                    }}
                    renderItem={({ item: emoji }) => {
                        const hasReacted = message?.reactions?.[emoji.char]?.includes(currentUserId);
                        return (
                            <TouchableOpacity
                                style={styles.emojiPickerItemFlat}
                                onPress={() => handlePickerEmojiSelect(emoji.char)}
                                activeOpacity={0.6}
                            >
                                <Text style={styles.emojiPickerEmoji}>{emoji.char}</Text>
                                {hasReacted && <View style={styles.reactionIndicator} />}
                            </TouchableOpacity>
                        );
                    }}
                />
            </Animated.View>


            {/* Context Menu */}
            <Animated.View
                pointerEvents={showEmojiPicker ? 'none' : 'auto'}
                style={[
                    styles.menuContainer,
                    {
                        top: menuTop,
                        left: menuLeft,
                        width: MENU_WIDTH,
                        opacity: menuOpacity,
                        transform: [{ translateY: menuTranslateY }],
                        zIndex: 100
                    }
                ]}
            >
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={item.action}
                        style={[
                            styles.menuItem,
                            index === menuItems.length - 1 && styles.lastMenuItem
                        ]}
                        onPress={() => handleAction(item.action)}
                    >
                        <Text style={[styles.menuText, { color: item.color || '#fff' }]}>{item.label}</Text>
                        <Ionicons name={item.icon as any} size={20} color={item.color || '#fff'} />
                    </TouchableOpacity>
                ))}
            </Animated.View>

            {/* Falling Emoji Animation */}
            {fallingEmoji && (
                <Animated.View
                    style={{
                        position: 'absolute',
                        // Static start position - emoji center
                        left: fallingEmoji.startX - 12,
                        top: fallingEmoji.startY - 12,
                        transform: [
                            // Animate X: from 0 (at bar) to delta (at bubble)
                            {
                                translateX: fallAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, reactionTargetX - fallingEmoji.startX]
                                })
                            },
                            // Animate Y: from 0 (at bar) to delta (at bubble)
                            {
                                translateY: fallAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, reactionTargetY - fallingEmoji.startY]
                                })
                            },
                            // Scale: full size at bar, smaller at bubble
                            {
                                scale: fallAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 0.65]
                                })
                            }
                        ],
                        // Fade out at the end of animation (either direction)
                        opacity: fallAnim.interpolate({
                            inputRange: [0, 0.1, 0.9, 1],
                            outputRange: [1, 1, 1, 0.7]
                        }),
                        zIndex: 200,
                        pointerEvents: 'none',
                    }}
                >
                    <Text style={{ fontSize: 24 }}>{fallingEmoji.emoji}</Text>
                </Animated.View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    menuContainer: {
        position: 'absolute',
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        paddingVertical: 8,
        paddingBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    lastMenuItem: {
        borderBottomWidth: 0,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
    },
    // Emoji Bar Styles
    emojiBarContainer: {
        position: 'absolute',
        height: 48,
        borderRadius: 24, // Pill
        overflow: 'hidden', // For Blur
        backgroundColor: 'rgba(30, 30, 30, 0.8)', // Fallback / Base
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        // Center alignment logic handled dynamically or flex
    },
    emojiRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        height: '100%',
        justifyContent: 'space-between', // Distribute
    },
    emojiItem: {
        paddingHorizontal: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiText: {
        fontSize: 24,
    },
    plusButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    // Emoji Picker Panel Styles (Instagram-style)
    emojiPickerContainer: {
        position: 'absolute',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 15,
        maxHeight: 280,
    },
    emojiCategoryTabs: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 8,
    },
    emojiCategoryTab: {
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    emojiCategoryIcon: {
        fontSize: 22,
    },
    emojiGrid: {
        paddingHorizontal: 8,
        paddingTop: 8,
    },
    emojiGridContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    emojiPickerItem: {
        width: '12.5%', // 8 per row
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiPickerItemFlat: {
        flex: 1,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: '12.5%',
    },
    emojiPickerEmoji: {
        fontSize: 24,
    },
    // Search Bar Styles
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 12,
        marginTop: 12,
        marginBottom: 8,
        borderRadius: 20, // Match message bubble roundness
        paddingHorizontal: 10,
        height: 36,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        paddingVertical: 0, // Fix vertical alignment on Android
        height: '100%',
    },
    reactionIndicator: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#fff',
        marginTop: 2,
    },
});
