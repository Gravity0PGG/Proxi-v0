/**
 * Notification Store
 * Manages the list of user notifications and unread counts
 */

import { Notification } from '../types/notification.types';

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
}

let store: NotificationState = {
    notifications: [],
    unreadCount: 0,
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getNotificationStore(): NotificationState {
    return { ...store };
}

export function subscribe(callback: Subscriber): () => void {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
}

function notifySubscribers() {
    subscribers.forEach(cb => cb());
}

/**
 * Add a new notification
 */
export function addNotificationToStore(notification: Notification) {
    // Basic deduplication for follows and likes
    if (notification.type === 'follow' || notification.type === 'like') {
        const index = store.notifications.findIndex(n =>
            n.type === notification.type &&
            n.actorUserId === notification.actorUserId &&
            n.relatedPostId === notification.relatedPostId
        );
        if (index !== -1) {
            // Update timestamp of existing one instead of adding new
            store.notifications[index].createdAt = notification.createdAt;
            store.notifications[index].isRead = false;
            sortAndCount();
            return;
        }
    }

    store.notifications.push(notification);
    sortAndCount();
}

/**
 * Mark a notification as read
 */
export function markAsRead(notificationId: string) {
    const n = store.notifications.find(n => n.notificationId === notificationId);
    if (n && !n.isRead) {
        n.isRead = true;
        sortAndCount();
    }
}

/**
 * Mark all as read
 */
export function markAllAsRead() {
    store.notifications.forEach(n => n.isRead = true);
    sortAndCount();
}

/**
 * Helper: Sort (unread first, then newest) and update count
 */
function sortAndCount() {
    store.notifications.sort((a, b) => {
        if (a.isRead !== b.isRead) {
            return a.isRead ? 1 : -1;
        }
        return b.createdAt - a.createdAt;
    });

    store.unreadCount = store.notifications.filter(n => !n.isRead).length;
    notifySubscribers();
}

/**
 * Reset store
 */
export function resetNotificationStore() {
    store = {
        notifications: [],
        unreadCount: 0,
    };
    notifySubscribers();
}
