/**
 * Messaging Store
 * In-memory cache backed by SQLite for persistence
 */

import { Message, Conversation, TypingState } from '../types/messaging.types';
import {
    saveMessage,
    saveConversation as saveConversationToDB,
    updateMessageInDB,
    getMessagesForConversation,
    getConversations as getConversationsFromDB,
    getLatestMessageTimestamp,
    clearAllMessageData
} from '../services/messageDatabase';

interface MessagingState {
    conversations: Record<string, Conversation>;
    messagesByConversation: Record<string, Message[]>;
    activeConversationId: string | null;
    typingStates: Record<string, TypingState>;
    // Pagination tracking
    hasMoreMessages: Record<string, boolean>;
    loadedMessageCounts: Record<string, number>;
}

let store: MessagingState = {
    conversations: {},
    messagesByConversation: {},
    activeConversationId: null,
    typingStates: {},
    hasMoreMessages: {},
    loadedMessageCounts: {}
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getMessagingStore(): MessagingState {
    return { ...store };
}

export function subscribe(callback: Subscriber): () => void {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
}

function notifySubscribers() {
    subscribers.forEach(cb => cb());
}

// ============================================================================
// DATABASE HYDRATION (Load from SQLite on startup)
// ============================================================================

/**
 * Load conversations from SQLite into memory
 */
export async function loadConversationsFromDatabase(): Promise<void> {
    try {
        const conversations = await getConversationsFromDB();
        conversations.forEach(conv => {
            store.conversations[conv.conversationId] = conv;
        });
        console.log(`[MessagingStore] Loaded ${conversations.length} conversations from DB`);
        notifySubscribers();
    } catch (error) {
        console.error('[MessagingStore] Error loading conversations:', error);
    }
}

/**
 * Load initial messages for a conversation (paginated)
 * Called when user opens a chat
 */
export async function loadMessagesForConversation(
    conversationId: string,
    limit: number = 20
): Promise<Message[]> {
    try {
        const messages = await getMessagesForConversation(conversationId, limit, 0);

        // Messages come in DESC order, reverse for display (oldest first)
        const orderedMessages = messages.reverse();

        store.messagesByConversation[conversationId] = orderedMessages;
        store.loadedMessageCounts[conversationId] = messages.length;
        store.hasMoreMessages[conversationId] = messages.length === limit;

        console.log(`[MessagingStore] Loaded ${messages.length} messages for ${conversationId}`);
        notifySubscribers();
        return orderedMessages;
    } catch (error) {
        console.error('[MessagingStore] Error loading messages:', error);
        return [];
    }
}

/**
 * Load more messages for infinite scroll
 */
export async function loadMoreMessages(
    conversationId: string,
    limit: number = 20
): Promise<Message[]> {
    try {
        const currentCount = store.loadedMessageCounts[conversationId] || 0;
        const olderMessages = await getMessagesForConversation(conversationId, limit, currentCount);

        if (olderMessages.length === 0) {
            store.hasMoreMessages[conversationId] = false;
            notifySubscribers();
            return [];
        }

        // Prepend older messages (they come in DESC, reverse for display)
        const orderedOlder = olderMessages.reverse();
        store.messagesByConversation[conversationId] = [
            ...orderedOlder,
            ...(store.messagesByConversation[conversationId] || [])
        ];
        store.loadedMessageCounts[conversationId] = currentCount + olderMessages.length;
        store.hasMoreMessages[conversationId] = olderMessages.length === limit;

        console.log(`[MessagingStore] Loaded ${olderMessages.length} more messages`);
        notifySubscribers();
        return orderedOlder;
    } catch (error) {
        console.error('[MessagingStore] Error loading more messages:', error);
        return [];
    }
}

/**
 * Check if more messages are available for a conversation
 */
export function hasMoreMessagesAvailable(conversationId: string): boolean {
    return store.hasMoreMessages[conversationId] ?? true;
}

/**
 * Get the latest message timestamp for delta sync
 */
export async function getLatestTimestampForConversation(conversationId: string): Promise<number | null> {
    return await getLatestMessageTimestamp(conversationId);
}

// ============================================================================
// CONVERSATION OPERATIONS
// ============================================================================

/**
 * Add or update a conversation (in-memory + SQLite)
 */
export async function setConversation(conv: Conversation) {
    store.conversations[conv.conversationId] = conv;

    // Persist to SQLite (non-blocking)
    saveConversationToDB(conv).catch(err => {
        console.error('[MessagingStore] Failed to persist conversation:', err);
    });

    notifySubscribers();
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Add a message to a conversation (in-memory + SQLite)
 */
export async function addMessageToStore(message: Message) {
    const convId = message.conversationId;

    // Add to in-memory store
    if (!store.messagesByConversation[convId]) {
        store.messagesByConversation[convId] = [];
    }

    // Check for duplicate (prevent double-add from realtime + local)
    const exists = store.messagesByConversation[convId].some(
        m => m.messageId === message.messageId
    );
    if (!exists) {
        store.messagesByConversation[convId].push(message);
    }

    // Update conversation last message and activity
    const conv = store.conversations[convId];
    if (conv) {
        conv.lastMessage = {
            content: message.content,
            senderId: message.senderId,
            createdAt: message.createdAt
        };
        conv.lastActivityAt = message.createdAt;
        if (message.senderId !== 'currentUser') {
            conv.unreadCount += 1;
        }

        // Persist conversation update
        saveConversationToDB(conv).catch(err => {
            console.error('[MessagingStore] Failed to persist conversation:', err);
        });
    }

    // Persist message to SQLite (non-blocking)
    saveMessage(message).catch(err => {
        console.error('[MessagingStore] Failed to persist message:', err);
    });

    notifySubscribers();
}

/**
 * Set active conversation
 */
export function setActiveConversation(convId: string | null) {
    store.activeConversationId = convId;
    if (convId && store.conversations[convId]) {
        store.conversations[convId].unreadCount = 0;
    }
    notifySubscribers();
}

/**
 * Set typing state
 */
export function setTypingState(typing: TypingState) {
    const key = `${typing.userId}_${typing.conversationId}`;
    store.typingStates[key] = typing;
    notifySubscribers();
}

/**
 * Reset store (for logout)
 */
export async function resetMessagingStore() {
    store = {
        conversations: {},
        messagesByConversation: {},
        activeConversationId: null,
        typingStates: {},
        hasMoreMessages: {},
        loadedMessageCounts: {}
    };

    // Clear SQLite data
    await clearAllMessageData();

    notifySubscribers();
}

/**
 * Update an existing message in the store (in-memory + SQLite)
 */
export async function updateMessageInStore(messageId: string, updates: Partial<Message>) {
    // Find the conversation containing the message
    for (const convId in store.messagesByConversation) {
        const messages = store.messagesByConversation[convId];
        const index = messages.findIndex(m => m.messageId === messageId);

        if (index !== -1) {
            // Update in memory
            store.messagesByConversation[convId][index] = {
                ...messages[index],
                ...updates
            };

            // If this was the last message, update conversation preview if content changed
            const conv = store.conversations[convId];
            if (conv && index === messages.length - 1 && updates.content) {
                if (conv.lastMessage) {
                    conv.lastMessage.content = updates.content;
                }
            }

            // Persist to SQLite (non-blocking)
            updateMessageInDB(messageId, updates).catch(err => {
                console.error('[MessagingStore] Failed to persist message update:', err);
            });

            notifySubscribers();
            return;
        }
    }
}

/**
 * Merge new messages from sync (delta sync result)
 */
export async function mergeMessagesFromSync(conversationId: string, newMessages: Message[]) {
    if (newMessages.length === 0) return;

    if (!store.messagesByConversation[conversationId]) {
        store.messagesByConversation[conversationId] = [];
    }

    // Filter out duplicates and add new ones
    const existingIds = new Set(
        store.messagesByConversation[conversationId].map(m => m.messageId)
    );

    const uniqueNew = newMessages.filter(m => !existingIds.has(m.messageId));

    // Sort all messages by createdAt
    store.messagesByConversation[conversationId] = [
        ...store.messagesByConversation[conversationId],
        ...uniqueNew
    ].sort((a, b) => a.createdAt - b.createdAt);

    // Persist new messages to SQLite
    for (const msg of uniqueNew) {
        saveMessage(msg).catch(err => {
            console.error('[MessagingStore] Failed to persist synced message:', err);
        });
    }

    // Update conversation if we have new messages
    if (uniqueNew.length > 0) {
        const lastMsg = uniqueNew[uniqueNew.length - 1];
        const conv = store.conversations[conversationId];
        if (conv && lastMsg.createdAt > (conv.lastActivityAt || 0)) {
            conv.lastMessage = {
                content: lastMsg.content,
                senderId: lastMsg.senderId,
                createdAt: lastMsg.createdAt
            };
            conv.lastActivityAt = lastMsg.createdAt;
            saveConversationToDB(conv).catch(err => {
                console.error('[MessagingStore] Failed to persist conversation:', err);
            });
        }
    }

    console.log(`[MessagingStore] Merged ${uniqueNew.length} new messages from sync`);
    notifySubscribers();
}
