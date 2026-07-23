/**
 * Social Service
 * Foundation layer for relationships and social graph
 */

import { setFollowing, setFollowers, trackInteraction, getSocialStore, clearRankedFeed } from '../store/social.store';
import { getCurrentUser } from '../store/auth.store';

import { NotificationTriggers } from './notification.service';

/**
 * Follow a user
 */
export async function followUser(followerId: string, followedId: string) {
    const socialStore = getSocialStore();

    if (socialStore.following.includes(followedId)) return;

    // 1. Update Social Store
    setFollowing([...socialStore.following, followedId]);

    // 2. Clear ranked feed to force refresh with new social boost
    clearRankedFeed();

    // 3. Trigger Notification
    NotificationTriggers.onFollow(followerId, followedId);

    console.log(`SocialService: ${followerId} followed ${followedId}`);
}

/**
 * Unfollow a user
 */
export async function unfollowUser(targetId: string): Promise<void> {
    const currentStore = getSocialStore();
    const newFollowing = currentStore.following.filter(id => id !== targetId);
    setFollowing(newFollowing);
}

/**
 * Load social relationships (initial load)
 */
export async function loadSocialGraph(): Promise<void> {
    const user = getCurrentUser();
    if (!user) return;

    // Mock initial state
    // In a real app, these would come from an API
    setFollowing(['user_002', 'user_003']);
    setFollowers(['user_002', 'user_004']);

    // Seed some interactions
    trackInteraction('followedUserIds', 'user_002');
    trackInteraction('likedUserIds', 'user_002');
    trackInteraction('messagedUserIds', 'user_005');
}

/**
 * Log a messaging interaction
 */
export function logMessageInteraction(userId: string) {
    trackInteraction('messagedUserIds', userId);
}

/**
 * Log a like interaction
 */
export function logLikeInteraction(userId: string) {
    trackInteraction('likedUserIds', userId);
}
