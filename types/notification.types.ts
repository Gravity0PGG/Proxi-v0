/**
 * Notification Types
 */

export type NotificationType = 'like' | 'comment' | 'follow' | 'message' | 'mention';

export interface Notification {
    notificationId: string;
    type: NotificationType;
    actorUserId: string;
    targetUserId: string;
    relatedPostId?: string;
    content?: string; // Optional snippet of message/comment
    createdAt: number;
    isRead: boolean;
}
