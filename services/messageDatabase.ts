/**
 * Message Database Service
 * SQLite persistence for chat messages and conversations
 */

import * as SQLite from 'expo-sqlite';
import { Message, Conversation, MessageStatus, MessageType } from '../types/messaging.types';

const db = SQLite.openDatabaseSync('messages.db');

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

export const initMessageDatabase = async (): Promise<void> => {
    try {
        await db.execAsync('PRAGMA foreign_keys = ON;');

        // Messages Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS messages (
                message_id TEXT PRIMARY KEY NOT NULL,
                conversation_id TEXT NOT NULL,
                sender_id TEXT NOT NULL,
                receiver_id TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT DEFAULT 'text',
                created_at INTEGER NOT NULL,
                read_at INTEGER,
                status TEXT DEFAULT 'sent',
                is_edited INTEGER DEFAULT 0,
                is_pinned INTEGER DEFAULT 0,
                is_deleted INTEGER DEFAULT 0,
                is_forwarded INTEGER DEFAULT 0,
                parent_id TEXT,
                deleted_for TEXT,
                reactions TEXT
            );
        `);

        // Conversations Table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS conversations (
                conversation_id TEXT PRIMARY KEY NOT NULL,
                participants TEXT NOT NULL,
                last_message_content TEXT,
                last_message_sender_id TEXT,
                last_message_created_at INTEGER,
                unread_count INTEGER DEFAULT 0,
                last_activity_at INTEGER
            );
        `);

        // Performance Indexes (Critical for fast queries)
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_messages_conversation 
            ON messages(conversation_id);
        `);
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_messages_created 
            ON messages(created_at DESC);
        `);
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_messages_conv_created 
            ON messages(conversation_id, created_at DESC);
        `);

        console.log('[MessageDB] Database initialized successfully');
    } catch (error) {
        console.error('[MessageDB] Initialization error:', error);
        throw error;
    }
};

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Save a single message to the database
 */
export const saveMessage = async (message: Message): Promise<void> => {
    try {
        await db.runAsync(
            `INSERT OR REPLACE INTO messages (
                message_id, conversation_id, sender_id, receiver_id, content, type,
                created_at, read_at, status, is_edited, is_pinned, is_deleted,
                is_forwarded, parent_id, deleted_for, reactions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                message.messageId,
                message.conversationId,
                message.senderId,
                message.receiverId,
                message.content,
                message.type || 'text',
                message.createdAt,
                message.readAt,
                message.status,
                message.isEdited ? 1 : 0,
                message.isPinned ? 1 : 0,
                message.isDeleted ? 1 : 0,
                message.isForwarded ? 1 : 0,
                message.parentId || null,
                message.deletedFor ? JSON.stringify(message.deletedFor) : null,
                message.reactions ? JSON.stringify(message.reactions) : null
            ]
        );
    } catch (error) {
        console.error('[MessageDB] Error saving message:', error);
        throw error;
    }
};

/**
 * Batch save multiple messages (for sync operations)
 */
export const saveMessages = async (messages: Message[]): Promise<void> => {
    if (messages.length === 0) return;

    try {
        await db.withTransactionAsync(async () => {
            for (const message of messages) {
                await saveMessage(message);
            }
        });
        console.log(`[MessageDB] Batch saved ${messages.length} messages`);
    } catch (error) {
        console.error('[MessageDB] Batch save error:', error);
        throw error;
    }
};

/**
 * Get messages for a conversation with pagination
 * @param conversationId - The conversation ID
 * @param limit - Number of messages to fetch (default 20)
 * @param offset - Offset for pagination (default 0)
 * @returns Array of messages ordered by createdAt DESC
 */
export const getMessagesForConversation = async (
    conversationId: string,
    limit: number = 20,
    offset: number = 0
): Promise<Message[]> => {
    try {
        const rows = await db.getAllAsync<{
            message_id: string;
            conversation_id: string;
            sender_id: string;
            receiver_id: string;
            content: string;
            type: string;
            created_at: number;
            read_at: number | null;
            status: string;
            is_edited: number;
            is_pinned: number;
            is_deleted: number;
            is_forwarded: number;
            parent_id: string | null;
            deleted_for: string | null;
            reactions: string | null;
        }>(`
            SELECT * FROM messages 
            WHERE conversation_id = ? 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?;
        `, [conversationId, limit, offset]);

        // Map snake_case DB columns to camelCase interface
        return rows.map(row => ({
            messageId: row.message_id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            receiverId: row.receiver_id,
            content: row.content,
            type: row.type as MessageType,
            createdAt: row.created_at,
            readAt: row.read_at,
            status: row.status as MessageStatus,
            isEdited: row.is_edited === 1,
            isPinned: row.is_pinned === 1,
            isDeleted: row.is_deleted === 1,
            isForwarded: row.is_forwarded === 1,
            parentId: row.parent_id,
            deletedFor: row.deleted_for ? JSON.parse(row.deleted_for) : undefined,
            reactions: row.reactions ? JSON.parse(row.reactions) : undefined
        }));
    } catch (error) {
        console.error('[MessageDB] Error fetching messages:', error);
        return [];
    }
};

/**
 * Get the timestamp of the latest message in a conversation
 * Used for delta sync
 */
export const getLatestMessageTimestamp = async (conversationId: string): Promise<number | null> => {
    try {
        const result = await db.getFirstAsync<{ max_created: number | null }>(`
            SELECT MAX(created_at) as max_created 
            FROM messages 
            WHERE conversation_id = ?;
        `, [conversationId]);
        return result?.max_created || null;
    } catch (error) {
        console.error('[MessageDB] Error getting latest timestamp:', error);
        return null;
    }
};

/**
 * Update a message in the database
 */
export const updateMessageInDB = async (
    messageId: string,
    updates: Partial<Message>
): Promise<void> => {
    try {
        const setClauses: string[] = [];
        const values: any[] = [];

        if (updates.content !== undefined) {
            setClauses.push('content = ?');
            values.push(updates.content);
        }
        if (updates.status !== undefined) {
            setClauses.push('status = ?');
            values.push(updates.status);
        }
        if (updates.readAt !== undefined) {
            setClauses.push('read_at = ?');
            values.push(updates.readAt);
        }
        if (updates.isEdited !== undefined) {
            setClauses.push('is_edited = ?');
            values.push(updates.isEdited ? 1 : 0);
        }
        if (updates.isPinned !== undefined) {
            setClauses.push('is_pinned = ?');
            values.push(updates.isPinned ? 1 : 0);
        }
        if (updates.isDeleted !== undefined) {
            setClauses.push('is_deleted = ?');
            values.push(updates.isDeleted ? 1 : 0);
        }
        if (updates.deletedFor !== undefined) {
            setClauses.push('deleted_for = ?');
            values.push(JSON.stringify(updates.deletedFor));
        }
        if (updates.reactions !== undefined) {
            setClauses.push('reactions = ?');
            values.push(JSON.stringify(updates.reactions));
        }

        if (setClauses.length === 0) return;

        values.push(messageId);
        await db.runAsync(
            `UPDATE messages SET ${setClauses.join(', ')} WHERE message_id = ?;`,
            values
        );
    } catch (error) {
        console.error('[MessageDB] Error updating message:', error);
        throw error;
    }
};

/**
 * Delete a message from the database
 */
export const deleteMessageFromDB = async (messageId: string): Promise<void> => {
    try {
        await db.runAsync('DELETE FROM messages WHERE message_id = ?;', [messageId]);
    } catch (error) {
        console.error('[MessageDB] Error deleting message:', error);
        throw error;
    }
};

/**
 * Get message count for a conversation
 */
export const getMessageCount = async (conversationId: string): Promise<number> => {
    try {
        const result = await db.getFirstAsync<{ count: number }>(`
            SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?;
        `, [conversationId]);
        return result?.count || 0;
    } catch (error) {
        console.error('[MessageDB] Error getting message count:', error);
        return 0;
    }
};

// ============================================================================
// CONVERSATION OPERATIONS
// ============================================================================

/**
 * Save a conversation to the database
 */
export const saveConversation = async (conv: Conversation): Promise<void> => {
    try {
        await db.runAsync(
            `INSERT OR REPLACE INTO conversations (
                conversation_id, participants, last_message_content, 
                last_message_sender_id, last_message_created_at, 
                unread_count, last_activity_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [
                conv.conversationId,
                JSON.stringify(conv.participants),
                conv.lastMessage?.content || null,
                conv.lastMessage?.senderId || null,
                conv.lastMessage?.createdAt || null,
                conv.unreadCount,
                conv.lastActivityAt
            ]
        );
    } catch (error) {
        console.error('[MessageDB] Error saving conversation:', error);
        throw error;
    }
};

/**
 * Get all conversations ordered by last activity
 */
export const getConversations = async (): Promise<Conversation[]> => {
    try {
        const rows = await db.getAllAsync<{
            conversation_id: string;
            participants: string;
            last_message_content: string | null;
            last_message_sender_id: string | null;
            last_message_created_at: number | null;
            unread_count: number;
            last_activity_at: number;
        }>(`
            SELECT * FROM conversations ORDER BY last_activity_at DESC;
        `);

        return rows.map(row => ({
            conversationId: row.conversation_id,
            participants: JSON.parse(row.participants),
            lastMessage: row.last_message_content ? {
                content: row.last_message_content,
                senderId: row.last_message_sender_id || '',
                createdAt: row.last_message_created_at || 0
            } : undefined,
            unreadCount: row.unread_count,
            lastActivityAt: row.last_activity_at
        }));
    } catch (error) {
        console.error('[MessageDB] Error fetching conversations:', error);
        return [];
    }
};

/**
 * Update unread count for a conversation
 */
export const updateConversationUnreadCount = async (
    conversationId: string,
    unreadCount: number
): Promise<void> => {
    try {
        await db.runAsync(
            'UPDATE conversations SET unread_count = ? WHERE conversation_id = ?;',
            [unreadCount, conversationId]
        );
    } catch (error) {
        console.error('[MessageDB] Error updating unread count:', error);
    }
};

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

/**
 * Clear all message data (for logout)
 */
export const clearAllMessageData = async (): Promise<void> => {
    try {
        await db.execAsync('DELETE FROM messages;');
        await db.execAsync('DELETE FROM conversations;');
        console.log('[MessageDB] All data cleared');
    } catch (error) {
        console.error('[MessageDB] Error clearing data:', error);
        throw error;
    }
};

/**
 * Get database stats for debugging
 */
export const getDatabaseStats = async (): Promise<{
    messageCount: number;
    conversationCount: number;
}> => {
    try {
        const msgResult = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM messages;'
        );
        const convResult = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM conversations;'
        );
        return {
            messageCount: msgResult?.count || 0,
            conversationCount: convResult?.count || 0
        };
    } catch (error) {
        console.error('[MessageDB] Error getting stats:', error);
        return { messageCount: 0, conversationCount: 0 };
    }
};
