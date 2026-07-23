/**
 * Social Store
 * Manages following/followers and interactions
 */

import { SocialGraphState } from '../types/social.types';

let store: SocialGraphState = {
    followers: [],
    following: [],
    friends: [],
    interests: [],
    interactions: {
        recentlyMessagedUserIds: [],
        frequentlyMessagedUserIds: [],
        contentLikedByFriends: [],
        contentViewedByFriends: [],
        followedUserIds: [],
        engagedCategoryCounts: {},
        messagedUserIds: [],
        likedUserIds: [],
        friendsInteractedUserIds: [],
    }
};

/**
 * Reset store
 */
export function resetSocialStore() {
    store = {
        friends: [],
        following: [],
        followers: [],
        interests: [],
        interactions: {
            recentlyMessagedUserIds: [],
            frequentlyMessagedUserIds: [],
            contentLikedByFriends: [],
            contentViewedByFriends: [],
            followedUserIds: [],
            engagedCategoryCounts: {},
            messagedUserIds: [],
            likedUserIds: [],
            friendsInteractedUserIds: [],
        }
    };
    notifySubscribers();
}

/**
 * Hook for ranking engine to reset feed
 * (Injected from feed.store or discovery service)
 */
export function clearRankedFeed() {
    // This is a bridge. In a real app, this might dispatch to a global event bus.
    console.log('[SocialStore] Requesting feed refresh...');
}

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getSocialStore(): SocialGraphState {
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
 * Set followers list
 */
export function setFollowers(userIds: string[]) {
    store.followers = userIds;
    updateFriends();
    notifySubscribers();
}

/**
 * Set following list
 */
export function setFollowing(userIds: string[]) {
    store.following = userIds;
    updateFriends();
    notifySubscribers();
}

/**
 * Set user interests
 */
export function setInterests(interests: string[]) {
    store.interests = interests;
    notifySubscribers();
}

/**
 * Track messaging affinity
 */
export function trackMessaging(userId: string, isFrequent: boolean = false) {
    if (!store.interactions.recentlyMessagedUserIds.includes(userId)) {
        store.interactions.recentlyMessagedUserIds = [userId, ...store.interactions.recentlyMessagedUserIds].slice(0, 20);
    }
    if (isFrequent && !store.interactions.frequentlyMessagedUserIds.includes(userId)) {
        store.interactions.frequentlyMessagedUserIds.push(userId);
    }
    notifySubscribers();
}

/**
 * Set signals from friends
 */
export function setFriendSignals(likedPostIds: string[], viewedPostIds: string[]) {
    store.interactions.contentLikedByFriends = likedPostIds;
    store.interactions.contentViewedByFriends = viewedPostIds;
    notifySubscribers();
}

/**
 * Track an interaction signal
 */
export function trackInteraction(type: keyof typeof store.interactions, id: string) {
    if (!Array.isArray(store.interactions[type])) return;

    const list = store.interactions[type] as string[];
    if (!list.includes(id)) {
        (store.interactions[type] as string[]) = [...list, id];
        notifySubscribers();
    }
}

/**
 * Helper to update friends list (mutual follows)
 */
function updateFriends() {
    store.friends = store.following.filter(id => store.followers.includes(id));
}
