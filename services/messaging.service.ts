/**
 * Messaging Service
 * Business logic for sending, receiving, and affinity calculations
 */

import { Message, Conversation, TypingState, MessageType } from '../types/messaging.types';
import {
    getMessagingStore,
    addMessageToStore,
    setConversation,
    setTypingState,
    updateMessageInStore,
    loadMessagesForConversation,
    getLatestTimestampForConversation,
    mergeMessagesFromSync
} from '../store/messaging.store';
import { getCurrentUser } from '../store/auth.store';
import { trackMessaging } from '../store/social.store';
import { supabase } from './supabase';

/**
 * Send a message (Supabase + Store)
 */
export async function sendMessage(
    receiverId: string,
    content: string,
    type: MessageType = 'text',
    parentId?: string | null,
    isForwarded: boolean = false
) {
    try {
        // 1. Get Real User (Sender) from Session OR Fallback to Store
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        let senderId: string | undefined;

        if (session?.user) {
            senderId = session.user.id;
        } else {
            console.warn('[Messaging] No active Supabase session, checking local store fallback...');
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.id) {
                senderId = currentUser.id;
            }
        }

        if (!senderId) {
            console.error('[Messaging] Cannot send: User not authenticated (No session & No local user)');
            return;
        }

        // 2. UUID Validation Helper
        const isValidUUID = (id: string): boolean => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            return uuidRegex.test(id);
        };

        // 3. Determine if this is a mock conversation
        const isMockRecipient = !isValidUUID(receiverId);
        const isMockSender = !isValidUUID(senderId);

        if (isMockRecipient || isMockSender) {
            console.log(`[Messaging] Mock chat detected (sender: ${senderId}, receiver: ${receiverId}). Skipping database insert.`);
        }

        // 4. Generate conversation ID
        const convId = getConversationId(senderId, receiverId);

        // 5. Ensure conversation exists in local store
        const store = getMessagingStore();
        if (!store.conversations[convId]) {
            const newConv: Conversation = {
                conversationId: convId,
                participants: [senderId, receiverId],
                unreadCount: 0,
                lastActivityAt: Date.now()
            };
            setConversation(newConv);
        }

        // 6. Create message for local store (works for both mock and real)
        // Generate UUID v4 (React Native compatible)
        const messageId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        const createdAt = Date.now();

        const message: Message = {
            messageId,
            conversationId: convId,
            senderId,
            receiverId,
            content,
            createdAt,
            readAt: null,
            status: 'sent',
            type,
            parentId: parentId || undefined,
            isForwarded
        };

        // 7. Always update local store (for immediate UI feedback)
        addMessageToStore(message);
        trackMessaging(receiverId);

        // 8. Only persist to database if BOTH users are real UUIDs
        if (!isMockRecipient && !isMockSender) {
            console.log('[Messaging] Real users detected. Persisting to database:', { messageId, senderId, receiverId });

            const { error } = await supabase
                .from('messages')
                .insert({
                    id: messageId,
                    conversation_id: convId,
                    sender_id: senderId,
                    recipient_id: receiverId,
                    content: content,
                    type: type,
                    parent_id: parentId,
                    created_at: new Date(createdAt).toISOString(),
                    is_edited: false,
                    is_deleted: false,
                    is_pinned: false,
                    is_forwarded: isForwarded
                });

            if (error) {
                console.error('[Messaging] Database persistence failed:', error);
                // UI already updated, so this is just a warning
            } else {
                console.log(`[Messaging] ✓ Persisted to database: ${messageId}`);
            }
        }

        return message;
    } catch (e) {
        console.error('[Messaging] Exception during sendMessage:', e);
        return null;
    }
}

/**
 * Update a message (Edit, Pin, Delete)
 */
export async function updateMessage(messageId: string, updates: Partial<Message>) {
    // 1. Optimistic Update
    updateMessageInStore(messageId, updates);

    // 2. Supabase UPDATE
    const dbUpdates: any = {};
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.isEdited !== undefined) dbUpdates.is_edited = updates.isEdited;
    if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
    if (updates.isDeleted !== undefined) dbUpdates.is_deleted = updates.isDeleted;

    const { error } = await supabase
        .from('messages')
        .update(dbUpdates)
        .eq('id', messageId);

    if (error) {
        console.error('[Messaging] Update Error:', error);
    }
}

/**
 * Soft Delete Message
 */
/**
 * Delete Message (Two-Stage)
 */
export async function deleteMessage(messageId: string, mode: 'me' | 'everyone' = 'everyone', userId?: string) {
    // Get User ID if not provided
    let currentUserId = userId;
    if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) currentUserId = user.id;
    }
    if (!currentUserId) return;
    if (mode === 'everyone') {
        // Soft Delete for Everyone
        await updateMessage(messageId, {
            isDeleted: true,
            content: 'This message was deleted',
            // Strip other fields/types if necessary
        });
    } else {
        // Delete for Me (Hide)

        // 1. Optimistic Local Update (Instant)
        const store = getMessagingStore();
        // Find message in any conversation (inefficient search, but safe)
        let localMessage: Message | undefined;
        // Optimization: We don't have conversationId passed here, but we can search or assuming it allows update by ID.
        // updateMessageInStore helper usually handles finding it?
        // Let's rely on updateMessageInStore merge logic, but we need the current list to append.

        // Actually, we can't easily get the current list without knowing the conv ID to find in store efficiently.
        // BUT, looking at `updateMessageInStore` implementation (implied), it might need the ID.
        // Let's just blindly push to local store if we can't find it?
        // Better: Fetch from DB is fine, but if it fails, we MUST fallback to local update.

        // Revised Strategy:
        // Try DB fetch. 
        // If DB success -> Use DB list + me -> Update Local & DB.
        // If DB fail (local msg) -> We assume local message has 'deletedFor' or empty.
        // We really need to look up the local message to append correctly.

        // Let's try to find it in the store purely by ID if possible, or just force the update.
        // Since we don't have the conversation ID easily here without looking up...
        // Actually, `sendMessage` knows the convID.

        const { data: msg, error: fetchError } = await supabase
            .from('messages')
            .select('deleted_for')
            .eq('id', messageId)
            .maybeSingle();

        let currentDeletedFor: string[] = [];

        if (msg && msg.deleted_for) {
            currentDeletedFor = msg.deleted_for;
        } else {
            // Not in DB or no deleted_for yet. Check local store?
            // For now, assume empty array locally if we can't sync.
            // But wait, if we overwrite with [me], we might lose others if we are offline?
            // If it's a local mock message, no one else has hidden it anyway. Safe to assume [].
        }

        if (!currentDeletedFor.includes(currentUserId)) {
            const newDeletedFor = [...currentDeletedFor, currentUserId];

            // 2. Update locally (Always success)
            updateMessageInStore(messageId, { deletedFor: newDeletedFor });

            // 3. Update DB (If msg existed)
            if (msg) {
                const { error: updateError } = await supabase
                    .from('messages')
                    .update({ deleted_for: newDeletedFor })
                    .eq('id', messageId);

                if (updateError) console.error('[Messaging] Delete for me error:', updateError);
            } else {
                console.log('[Messaging] Message local-only, hidden locally.');
            }
        }
    }
}

/**
 * Pin/Unpin Message
 */
export async function togglePinMessage(messageId: string, currentStatus: boolean) {
    await updateMessage(messageId, { isPinned: !currentStatus });
}

/**
 * Toggle Reaction (Add/Remove emoji reaction)
 */
export async function toggleReaction(messageId: string, emoji: string, userId?: string) {
    try {
        // Get current user ID
        let currentUserId = userId;
        if (!currentUserId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) currentUserId = user.id;
        }
        if (!currentUserId) {
            console.error('[Messaging] Cannot react: User not authenticated');
            return false;
        }

        // Get current reactions from store
        const store = getMessagingStore();
        let currentReactions: Record<string, string[]> = {};

        // Find message in store
        for (const convId in store.messagesByConversation) {
            const messages = store.messagesByConversation[convId];
            const msg = messages.find(m => m.messageId === messageId);
            if (msg) {
                currentReactions = { ...(msg.reactions || {}) };
                break;
            }
        }

        // Toggle logic
        const usersForEmoji = currentReactions[emoji] || [];
        const userIndex = usersForEmoji.indexOf(currentUserId);

        if (userIndex === -1) {
            // Add reaction
            currentReactions[emoji] = [...usersForEmoji, currentUserId];
        } else {
            // Remove reaction
            currentReactions[emoji] = usersForEmoji.filter(id => id !== currentUserId);
            // Clean up empty arrays
            if (currentReactions[emoji].length === 0) {
                delete currentReactions[emoji];
            }
        }

        // Update local store (optimistic) - works immediately
        updateMessageInStore(messageId, { reactions: currentReactions });

        // NOTE: Database update disabled - 'reactions' column doesn't exist yet
        // To enable: Add JSONB column 'reactions' to messages table in Supabase
        // Then uncomment:
        // const { error } = await supabase
        //     .from('messages')
        //     .update({ reactions: currentReactions })
        //     .eq('id', messageId);
        // if (error) console.warn('[Messaging] Reaction sync failed:', error.message);

        return true;
    } catch (e) {
        console.error('[Messaging] Exception during toggleReaction:', e);
        return false;
    }
}

import { NotificationTriggers } from './notification.service';

/**
 * Replaced by Realtime Subscription
 */
export function receiveMockMessage(senderId: string, content: string) {
    // Legacy mock support
}

/**
 * Realtime Subscription Setup
 * Listens for new messages and persists to SQLite
 */
export function subscribeToConversation(conversationId: string) {
    const subscription = supabase
        .channel(`chat:${conversationId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
            async (payload) => {
                console.log('[Messaging] Realtime INSERT:', payload.new);

                // Convert Supabase row to Message type
                const row = payload.new as any;
                const message: Message = {
                    messageId: row.id,
                    conversationId: row.conversation_id,
                    senderId: row.sender_id,
                    receiverId: row.recipient_id,
                    content: row.content,
                    type: row.type || 'text',
                    createdAt: new Date(row.created_at).getTime(),
                    readAt: row.read_at ? new Date(row.read_at).getTime() : null,
                    status: row.status || 'sent',
                    isEdited: row.is_edited || false,
                    isPinned: row.is_pinned || false,
                    isDeleted: row.is_deleted || false,
                    isForwarded: row.is_forwarded || false,
                    parentId: row.parent_id || undefined,
                    deletedFor: row.deleted_for || undefined,
                    reactions: row.reactions || undefined
                };

                // Add to store (which also persists to SQLite)
                await addMessageToStore(message);
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
            async (payload) => {
                console.log('[Messaging] Realtime UPDATE:', payload.new);
                const row = payload.new as any;

                // Update local store and SQLite
                await updateMessageInStore(row.id, {
                    content: row.content,
                    isEdited: row.is_edited,
                    isPinned: row.is_pinned,
                    isDeleted: row.is_deleted,
                    deletedFor: row.deleted_for,
                    reactions: row.reactions
                });
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(subscription);
    };
}

// Store reference to global subscription for cleanup
let globalMessageSubscription: ReturnType<typeof supabase.channel> | null = null;

/**
 * Global Message Listener
 * Subscribes to ALL messages for the current user (as sender OR receiver)
 * Runs at app-level for cross-device real-time sync
 */
export async function subscribeToUserMessages(): Promise<() => void> {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.warn('[Messaging] Cannot subscribe: No authenticated user');
        return () => { };
    }

    const userId = user.id;
    console.log(`[Messaging] Starting global message subscription for user: ${userId}`);

    // Unsubscribe from any existing global subscription
    if (globalMessageSubscription) {
        supabase.removeChannel(globalMessageSubscription);
        globalMessageSubscription = null;
    }

    // Subscribe to messages where user is RECEIVER (incoming messages)
    // Note: Supabase Realtime can only filter on one column at a time
    // So we subscribe to recipient_id and handle sender's own messages locally
    globalMessageSubscription = supabase
        .channel(`user-messages:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `recipient_id=eq.${userId}`
            },
            async (payload) => {
                console.log('[Messaging] Global: Received message:', payload.new);

                const row = payload.new as any;
                const message: Message = {
                    messageId: row.id,
                    conversationId: row.conversation_id,
                    senderId: row.sender_id,
                    receiverId: row.recipient_id,
                    content: row.content,
                    type: row.type || 'text',
                    createdAt: new Date(row.created_at).getTime(),
                    readAt: row.read_at ? new Date(row.read_at).getTime() : null,
                    status: row.status || 'sent',
                    isEdited: row.is_edited || false,
                    isPinned: row.is_pinned || false,
                    isDeleted: row.is_deleted || false,
                    isForwarded: row.is_forwarded || false,
                    parentId: row.parent_id || undefined,
                    deletedFor: row.deleted_for || undefined,
                    reactions: row.reactions || undefined
                };

                // Add to store (persists to SQLite + updates UI)
                await addMessageToStore(message);
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `sender_id=eq.${userId}`
            },
            async (payload) => {
                // This catches messages sent from OTHER devices with same account
                console.log('[Messaging] Global: Own message from another device:', payload.new);

                const row = payload.new as any;

                // Check if we already have this message (sent from this device)
                const store = getMessagingStore();
                const convMessages = store.messagesByConversation[row.conversation_id] || [];
                const exists = convMessages.some(m => m.messageId === row.id);

                if (!exists) {
                    const message: Message = {
                        messageId: row.id,
                        conversationId: row.conversation_id,
                        senderId: row.sender_id,
                        receiverId: row.recipient_id,
                        content: row.content,
                        type: row.type || 'text',
                        createdAt: new Date(row.created_at).getTime(),
                        readAt: row.read_at ? new Date(row.read_at).getTime() : null,
                        status: row.status || 'sent',
                        isEdited: row.is_edited || false,
                        isPinned: row.is_pinned || false,
                        isDeleted: row.is_deleted || false,
                        isForwarded: row.is_forwarded || false,
                        parentId: row.parent_id || undefined,
                        deletedFor: row.deleted_for || undefined,
                        reactions: row.reactions || undefined
                    };

                    await addMessageToStore(message);
                }
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `recipient_id=eq.${userId}`
            },
            async (payload) => {
                console.log('[Messaging] Global: Message update:', payload.new);
                const row = payload.new as any;

                await updateMessageInStore(row.id, {
                    content: row.content,
                    isEdited: row.is_edited,
                    isPinned: row.is_pinned,
                    isDeleted: row.is_deleted,
                    deletedFor: row.deleted_for,
                    reactions: row.reactions,
                    readAt: row.read_at ? new Date(row.read_at).getTime() : null
                });
            }
        )
        .subscribe((status) => {
            console.log(`[Messaging] Global subscription status: ${status}`);
        });

    // Return cleanup function
    return () => {
        console.log('[Messaging] Cleaning up global message subscription');
        if (globalMessageSubscription) {
            supabase.removeChannel(globalMessageSubscription);
            globalMessageSubscription = null;
        }
    };
}

/**
 * Unsubscribe from global messages (call on logout)
 */
export function unsubscribeFromUserMessages(): void {
    if (globalMessageSubscription) {
        supabase.removeChannel(globalMessageSubscription);
        globalMessageSubscription = null;
        console.log('[Messaging] Global subscription removed');
    }
}

/**
 * Delta Sync: Fetch messages newer than the last local message
 * Called when user opens a chat to catch up on missed messages
 */
export async function syncConversation(conversationId: string): Promise<number> {
    try {
        // 1. Load initial messages from local SQLite
        await loadMessagesForConversation(conversationId, 20);

        // 2. Get timestamp of latest local message
        const lastTimestamp = await getLatestTimestampForConversation(conversationId);

        // 3. If no local messages, fetch last 20 from Supabase
        // If we have local messages, only fetch newer ones (delta)
        let query = supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false });

        if (lastTimestamp) {
            // Delta sync: only get messages newer than latest local
            query = query.gt('created_at', new Date(lastTimestamp).toISOString());
        } else {
            // No local messages: get initial batch
            query = query.limit(20);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[Messaging] Sync error:', error);
            return 0;
        }

        if (!data || data.length === 0) {
            console.log('[Messaging] No new messages to sync');
            return 0;
        }

        // 4. Convert Supabase rows to Message objects
        const newMessages: Message[] = data.map((row: any) => ({
            messageId: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            receiverId: row.recipient_id,
            content: row.content,
            type: row.type || 'text',
            createdAt: new Date(row.created_at).getTime(),
            readAt: row.read_at ? new Date(row.read_at).getTime() : null,
            status: row.status || 'sent',
            isEdited: row.is_edited || false,
            isPinned: row.is_pinned || false,
            isDeleted: row.is_deleted || false,
            isForwarded: row.is_forwarded || false,
            parentId: row.parent_id || undefined,
            deletedFor: row.deleted_for || undefined,
            reactions: row.reactions || undefined
        }));

        // 5. Merge into local store and SQLite
        await mergeMessagesFromSync(conversationId, newMessages);

        console.log(`[Messaging] Synced ${newMessages.length} new messages`);
        return newMessages.length;
    } catch (e) {
        console.error('[Messaging] Exception during sync:', e);
        return 0;
    }
}


/**
 * Calculate messaging affinity for a user (Async - fetches ID)
 */
export async function getMessagingAffinity(targetUserId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    return getMessagingAffinitySync(user.id, targetUserId);
}

/**
 * Calculate messaging affinity (Synchronous - requires ID)
 */
export function getMessagingAffinitySync(currentUserId: string, targetUserId: string): number {
    const store = getMessagingStore();
    const convId = getConversationId(currentUserId, targetUserId);
    const messages = store.messagesByConversation[convId] || [];

    if (messages.length === 0) return 0;
    const now = Date.now();
    const recentMessages = messages.filter(m => now - m.createdAt < 7 * 24 * 60 * 60 * 1000);
    const recencyScore = recentMessages.length * 50;
    const totalCount = messages.length;
    return Math.min(recencyScore + (totalCount * 10), 1000);
}

/**
 * Helper to generate consistent Conversation ID
 */
export function getConversationId(k1: string, k2: string) {
    return [k1, k2].sort().join('_');
}

/**
 * Split message into chunks of max length, preserving words
 */
export function splitMessage(text: string, maxLength: number = 4096): string[] {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    let currentText = text;

    while (currentText.length > maxLength) {
        // Find split point (last space before limit)
        let splitIndex = currentText.lastIndexOf(' ', maxLength);

        // If no space found (very long word), split at limit
        if (splitIndex === -1) splitIndex = maxLength;

        chunks.push(currentText.substring(0, splitIndex));
        currentText = currentText.substring(splitIndex).trimStart();
    }

    if (currentText.length > 0) {
        chunks.push(currentText);
    }

    return chunks;
}
