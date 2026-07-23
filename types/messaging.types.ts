/**
 * Messaging System Types
 */

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'location' | 'sticker';

export interface Message {
    messageId: string;
    conversationId: string;
    senderId: string;
    receiverId: string;
    content: string;
    type?: MessageType;
    createdAt: number;
    readAt: number | null;
    status: MessageStatus;
    // Context Menu Fields
    isEdited?: boolean;
    isPinned?: boolean;
    isDeleted?: boolean;
    isForwarded?: boolean;
    parentId?: string | null;
    deletedFor?: string[]; // userIds who hid this message
    reactions?: Record<string, string[]>; // emoji -> array of userIds who reacted
}

export interface Conversation {
    conversationId: string;
    participants: string[]; // userIds
    lastMessage?: {
        content: string;
        senderId: string;
        createdAt: number;
    };
    unreadCount: number;
    lastActivityAt: number;
}

export interface TypingState {
    userId: string;
    conversationId: string;
    isTyping: boolean;
    startedAt: number;
}
