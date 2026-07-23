/**
 * Notification Service
 * Orchestrates notification generation and trigger rules
 */

import { NotificationType, Notification } from '../types/notification.types';
import { addNotificationToStore } from '../store/notification.store';

/**
 * Trigger a new notification
 */
export function triggerNotification(
    type: NotificationType,
    actorUserId: string,
    targetUserId: string,
    relatedPostId?: string,
    content?: string
) {
    if (actorUserId === targetUserId) return; // Don't notify self

    const notification: Notification = {
        notificationId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        actorUserId,
        targetUserId,
        relatedPostId,
        content,
        createdAt: Date.now(),
        isRead: false
    };

    addNotificationToStore(notification);
    console.log(`[NotificationEngine] Generated ${type} for ${targetUserId} from ${actorUserId}`);
}

/**
 * Helper triggers for common events
 */
export const NotificationTriggers = {
    onFollow: (followerId: string, followedId: string) => {
        triggerNotification('follow', followerId, followedId);
    },
    onMessage: (senderId: string, receiverId: string, textSnippet: string) => {
        triggerNotification('message', senderId, receiverId, undefined, textSnippet);
    },
    onLike: (likerId: string, postOwnerId: string, postId: string) => {
        triggerNotification('like', likerId, postOwnerId, postId);
    },
    onComment: (commenterId: string, postOwnerId: string, postId: string, commentSnippet: string) => {
        triggerNotification('comment', commenterId, postOwnerId, postId, commentSnippet);
    }
};
