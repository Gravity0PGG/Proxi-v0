import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ScrollView,
    Modal,
    Pressable,
    TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import CyberpunkTheme from '../../constants/Colors';

// Mock conversation data
interface User {
    id: string;
    name: string;
    avatar: string;
    hasStory: boolean;
}

interface Conversation {
    id: string;
    user: User;
    lastMessage: string;
    timestamp: string;
    unread: number;
    isPinned: boolean;
    isMuted: boolean;
}

export default function MessagesScreen() {
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Mock data for stories and conversations
    const storyUsers: User[] = [
        { id: '1', name: 'Alex', avatar: '👤', hasStory: true },
        { id: '2', name: 'Sarah', avatar: '👤', hasStory: true },
        { id: '3', name: 'Mike', avatar: '👤', hasStory: false },
        { id: '4', name: 'Emma', avatar: '👤', hasStory: true },
        { id: '5', name: 'Jack', avatar: '👤', hasStory: false },
    ];

    useEffect(() => {
        // Mock conversations
        const mockConversations = [
            {
                id: '1',
                user: { id: '1', name: 'Alex Chen', avatar: '👤', hasStory: true },
                lastMessage: 'See you at the event tonight!',
                timestamp: '2m ago',
                unread: 2,
                isPinned: true,
                isMuted: false,
            },
            {
                id: '2',
                user: { id: '2', name: 'Sarah Kim', avatar: '👤', hasStory: true },
                lastMessage: 'Thanks for the recommendation 🙌',
                timestamp: '15m ago',
                unread: 0,
                isPinned: false,
                isMuted: false,
            },
            {
                id: '3',
                user: { id: '3', name: 'Mike Johnson', avatar: '👤', hasStory: false },
                lastMessage: 'Did you check out that new place?',
                timestamp: '1h ago',
                unread: 0,
                isPinned: false,
                isMuted: true,
            },
        ];
        setConversations(mockConversations);
        setFilteredConversations(mockConversations);
    }, []);

    // Filter conversations based on search query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredConversations(conversations);
        } else {
            const filtered = conversations.filter(
                (conv) =>
                    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredConversations(filtered);
        }
    }, [searchQuery, conversations]);

    const handleStoryPress = (user: User) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (user.hasStory) {
            // TODO: Navigate to story viewer
            console.log('Open story viewer for:', user.name);
        } else {
            // Navigate to profile
            // router.push(`/profile/${user.id}`);
            console.log('Navigate to profile:', user.id);
        }
    };

    const handleChatPress = (conversation: Conversation) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Navigate to chat screen with user ID and name
        router.push({
            pathname: `/chat/${conversation.user.id}` as any,
            params: {
                id: conversation.user.id,
                name: conversation.user.name
            }
        });
    };

    const handleLongPress = (conversation: Conversation) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedConversation(conversation);
        setMenuVisible(true);
    };

    const handleMenuAction = (action: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (!selectedConversation) return;

        switch (action) {
            case 'ai_summary':
                console.log('AI Summary for:', selectedConversation.user.name);
                // TODO: Trigger AI summarizer
                break;
            case 'pin':
                setConversations((prev) =>
                    prev.map((conv) =>
                        conv.id === selectedConversation.id
                            ? { ...conv, isPinned: !conv.isPinned }
                            : conv
                    )
                );
                break;
            case 'mute':
                setConversations((prev) =>
                    prev.map((conv) =>
                        conv.id === selectedConversation.id
                            ? { ...conv, isMuted: !conv.isMuted }
                            : conv
                    )
                );
                break;
            case 'delete':
                setConversations((prev) =>
                    prev.filter((conv) => conv.id !== selectedConversation.id)
                );
                break;
        }

        setMenuVisible(false);
        setSelectedConversation(null);
    };

    const renderStoryAvatar = (user: User) => (
        <TouchableOpacity
            key={user.id}
            style={styles.storyItem}
            onPress={() => handleStoryPress(user)}
            activeOpacity={0.7}
        >
            <View
                style={[
                    styles.storyRing,
                    user.hasStory && styles.storyRingActive,
                ]}
            >
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{user.avatar}</Text>
                </View>
            </View>
            <Text style={styles.storyName} numberOfLines={1}>
                {user.name}
            </Text>
        </TouchableOpacity>
    );

    const renderConversation = ({ item }: { item: Conversation }) => (
        <Pressable
            onPress={() => handleChatPress(item)}
            onLongPress={() => handleLongPress(item)}
            style={styles.conversationItem}
        >
            <View style={styles.conversationContent}>
                {/* Avatar */}
                <View style={styles.chatAvatar}>
                    <Text style={styles.chatAvatarText}>{item.user.avatar}</Text>
                    {item.user.hasStory && <View style={styles.storyIndicator} />}
                </View>

                {/* Chat Info - Center */}
                <View style={styles.chatInfo}>
                    {/* Top Section: Username */}
                    <View style={styles.chatNameRow}>
                        {item.isPinned && (
                            <Ionicons
                                name="pin"
                                size={14}
                                color={CyberpunkTheme.primary}
                                style={{ marginRight: 4 }}
                            />
                        )}
                        <Text style={styles.chatName} numberOfLines={1}>
                            {item.user.name}
                        </Text>
                    </View>

                    {/* Bottom Section: Smart-Line + Timestamp Row */}
                    <View style={styles.bottomRow}>
                        {/* Left: Smart-Line */}
                        <View style={styles.smartLineContainer}>
                            {item.isMuted && (
                                <Ionicons
                                    name="volume-mute"
                                    size={14}
                                    color={CyberpunkTheme.textTertiary}
                                    style={{ marginRight: 4 }}
                                />
                            )}
                            {item.unread >= 2 ? (
                                <Text style={styles.multiUnreadText}>
                                    +{item.unread} new messages
                                </Text>
                            ) : (
                                <Text
                                    style={[
                                        styles.lastMessage,
                                        item.unread === 1 && styles.lastMessageUnread,
                                    ]}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {item.lastMessage}
                                </Text>
                            )}
                        </View>

                        {/* Right: Timestamp */}
                        <Text style={styles.timestamp}>{item.timestamp}</Text>
                    </View>
                </View>

            </View >
        </Pressable >
    );

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons
                        name="search"
                        size={18}
                        color={CyberpunkTheme.primary}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search conversations..."
                        placeholderTextColor={CyberpunkTheme.inactive}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            style={styles.clearButton}
                        >
                            <Ionicons
                                name="close-circle"
                                size={18}
                                color={CyberpunkTheme.inactive}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Top Story Row */}
            <View style={styles.storySection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.storyScroll}
                >
                    {storyUsers.map(renderStoryAvatar)}
                </ScrollView>
            </View>

            {/* Conversations List */}
            <FlatList
                data={filteredConversations}
                renderItem={renderConversation}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.conversationsList}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons
                            name="search-outline"
                            size={60}
                            color={CyberpunkTheme.inactive}
                        />
                        <Text style={styles.emptyText}>No conversations found</Text>
                    </View>
                }
            />

            {/* Context Menu Modal */}
            <Modal
                visible={menuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setMenuVisible(false)}
                >
                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />

                    <View style={styles.menuContainer}>
                        <BlurView intensity={80} tint="dark" style={styles.menuBlur}>
                            {/* AI Summary */}
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => handleMenuAction('ai_summary')}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="sparkles"
                                    size={20}
                                    color={CyberpunkTheme.primary}
                                />
                                <Text style={styles.menuTextOrange}>AI Summary</Text>
                            </TouchableOpacity>

                            <View style={styles.menuDivider} />

                            {/* Pin/Unpin */}
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => handleMenuAction('pin')}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={selectedConversation?.isPinned ? 'pin' : 'pin-outline'}
                                    size={20}
                                    color={CyberpunkTheme.text}
                                />
                                <Text style={styles.menuText}>
                                    {selectedConversation?.isPinned ? 'Unpin' : 'Pin'}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.menuDivider} />

                            {/* Mute/Unmute */}
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => handleMenuAction('mute')}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={
                                        selectedConversation?.isMuted
                                            ? 'volume-medium'
                                            : 'volume-mute'
                                    }
                                    size={20}
                                    color={CyberpunkTheme.text}
                                />
                                <Text style={styles.menuText}>
                                    {selectedConversation?.isMuted ? 'Unmute' : 'Mute'}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.menuDivider} />

                            {/* Delete */}
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => handleMenuAction('delete')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="trash" size={20} color="#FF3B30" />
                                <Text style={styles.menuTextRed}>Delete</Text>
                            </TouchableOpacity>
                        </BlurView>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CyberpunkTheme.background,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: CyberpunkTheme.background,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: CyberpunkTheme.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: CyberpunkTheme.text,
        fontSize: 15,
    },
    clearButton: {
        padding: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        color: CyberpunkTheme.textSecondary,
        fontSize: 16,
        marginTop: 12,
    },
    storySection: {
        borderBottomWidth: 1,
        borderBottomColor: CyberpunkTheme.border,
        paddingVertical: 12,
    },
    storyScroll: {
        paddingHorizontal: 16,
        gap: 16,
    },
    storyItem: {
        alignItems: 'center',
        width: 70,
    },
    storyRing: {
        padding: 3,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: CyberpunkTheme.borderSubtle,
        marginBottom: 6,
    },
    storyRingActive: {
        borderColor: CyberpunkTheme.primary,
        borderWidth: 2.5,
        shadowColor: CyberpunkTheme.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 5,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: CyberpunkTheme.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: CyberpunkTheme.background,
    },
    avatarText: {
        fontSize: 30,
    },
    storyName: {
        color: CyberpunkTheme.textSecondary,
        fontSize: 12,
        textAlign: 'center',
    },
    conversationsList: {
        paddingTop: 8,
    },
    conversationItem: {
        backgroundColor: CyberpunkTheme.background,
    },
    conversationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    chatAvatar: {
        position: 'relative',
        marginRight: 12,
    },
    chatAvatarText: {
        fontSize: 24,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: CyberpunkTheme.surface,
        textAlign: 'center',
        lineHeight: 50,
        overflow: 'hidden',
    },
    storyIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: CyberpunkTheme.primary,
        borderWidth: 2,
        borderColor: CyberpunkTheme.background,
    },
    chatInfo: {
        flex: 1,
        justifyContent: 'center',
    },

    chatNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    chatName: {
        color: CyberpunkTheme.text,
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    smartLineContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    timestamp: {
        color: '#888888',
        fontSize: 11,
    },
    lastMessage: {
        color: CyberpunkTheme.textSecondary,
        fontSize: 14,
        flex: 1,
    },
    lastMessageUnread: {
        color: CyberpunkTheme.text,
        fontWeight: '500',
    },
    multiUnreadText: {
        color: CyberpunkTheme.primary,
        fontSize: 14,
        fontWeight: 'bold',
        textShadowColor: CyberpunkTheme.glowPrimary,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 4,
    },


    separator: {
        height: 1,
        backgroundColor: CyberpunkTheme.borderSubtle,
        marginLeft: 78,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContainer: {
        width: 250,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: CyberpunkTheme.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    menuBlur: {
        borderWidth: 1,
        borderColor: CyberpunkTheme.border,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 12,
    },
    menuDivider: {
        height: 1,
        backgroundColor: CyberpunkTheme.borderSubtle,
        marginHorizontal: 20,
    },
    menuText: {
        color: CyberpunkTheme.text,
        fontSize: 16,
        fontWeight: '500',
    },
    menuTextOrange: {
        color: CyberpunkTheme.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    menuTextRed: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: '500',
    },
});
