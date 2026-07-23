# AI Review Report: Stores

This report contains the full source code for all state management stores in the project.

## File: store/auth.store.ts
```ts
import * as SecureStore from 'expo-secure-store';

/**
 * Auth Store
 * Manages authentication state and token storage
 */

interface AuthState {
    isAuthenticated: boolean;
    token: string | null;
}

let store: AuthState = {
    isAuthenticated: false,
    token: null,
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getAuthState(): boolean {
    return store.isAuthenticated;
}

export function getCurrentUser(): { token: string | null } {
    return { token: store.token };
}

export function subscribe(callback: Subscriber): () => void {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
}

function notifySubscribers() {
    subscribers.forEach(cb => cb());
}

/**
 * Load token from secure storage on startup
 */
export async function loadAuthFromStorage(): Promise<boolean> {
    try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
            store.token = token;
            store.isAuthenticated = true;
            notifySubscribers();
            return true;
        }
    } catch (error) {
        console.error('Failed to load auth from storage:', error);
    }
    return false;
}

/**
 * Login: Save token and update state
 */
export async function login(token: string) {
    try {
        await SecureStore.setItemAsync('userToken', token);
        store.token = token;
        store.isAuthenticated = true;
        notifySubscribers();
    } catch (error) {
        console.error('Failed to save token:', error);
        throw error;
    }
}

/**
 * Logout: Clear token and update state
 */
export async function logout() {
    try {
        await SecureStore.deleteItemAsync('userToken');
        store.token = null;
        store.isAuthenticated = false;
        notifySubscribers();
    } catch (error) {
        console.error('Failed to delete token:', error);
    }
}
```

---

## File: store/content.store.ts
```ts
/**
 * Content Store
 * State management for posts and content metadata
 */

import { Post } from '../types/post.types';

interface ContentState {
    posts: Record<string, Post>;
    allPostIds: string[];
}

let store: ContentState = {
    posts: {},
    allPostIds: [],
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getContentStore(): ContentState {
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
 * Add or update a post in the store
 */
export function setPost(post: Post) {
    if (!store.posts[post.postId]) {
        store.allPostIds.push(post.postId);
    }
    store.posts[post.postId] = post;
    notifySubscribers();
}

/**
 * Bulk add posts
 */
export function setPosts(posts: Post[]) {
    posts.forEach(post => {
        if (!store.posts[post.postId]) {
            store.allPostIds.push(post.postId);
        }
        store.posts[post.postId] = post;
    });
    notifySubscribers();
}

/**
 * Get posts as array
 */
export function getPostsArray(): Post[] {
    return store.allPostIds.map(id => store.posts[id]);
}
```

---

## File: store/feed.store.ts
```ts
/**
 * Feed Store
 * Manages the state of the ranked and personalized feed
 */

interface FeedState {
    rankedPostIds: string[];
    isLoading: boolean;
    lastRankedAt: number | null;
}

let store: FeedState = {
    rankedPostIds: [],
    isLoading: false,
    lastRankedAt: null,
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getFeedStore(): FeedState {
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
 * Update the ranked feed
 */
export function setRankedFeed(postIds: string[]) {
    store.rankedPostIds = postIds;
    store.lastRankedAt = Date.now();
    store.isLoading = false;
    notifySubscribers();
}

/**
 * Set loading state
 */
export function setLoading(isLoading: boolean) {
    store.isLoading = isLoading;
    notifySubscribers();
}

/**
 * Reset feed
 */
export function resetFeed() {
    store.rankedPostIds = [];
    store.lastRankedAt = null;
    store.isLoading = false;
    notifySubscribers();
}
```

---

## File: store/feedContext.store.ts
```ts
/**
 * Feed Context Store
 * Manages the discovery context for the feed (e.g. location-based or default)
 */

import { TimeWindow } from '../types/post.types';

export interface FeedLocationContext {
    latitude: number;
    longitude: number;
}

interface FeedContextState {
    activeLocation: FeedLocationContext | null;
    activeRadius: number; // meters
    activeTimeWindow: TimeWindow;
    source: "map" | "default";
}

let store: FeedContextState = {
    activeLocation: null,
    activeRadius: 10000, // Default 10km
    activeTimeWindow: 'last24Hours',
    source: 'default',
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getFeedContextStore(): FeedContextState {
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
 * Set location-based discovery context
 */
export function setLocationContext(lat: number, lng: number, radius: number, timeWindow: TimeWindow = 'last24Hours') {
    store.activeLocation = { latitude: lat, longitude: lng };
    store.activeRadius = radius;
    store.activeTimeWindow = timeWindow;
    store.source = 'map';
    notifySubscribers();
}

/**
 * Reset to default (e.g. following/global)
 */
export function resetToDefaultContext() {
    store.activeLocation = null;
    store.activeRadius = 10000;
    store.activeTimeWindow = 'last24Hours';
    store.source = 'default';
    notifySubscribers();
}
```

---

## File: store/map.store.ts
```ts
/**
 * Map Store
 * Tracks the state of the map viewport and user interactions
 */

export interface MapRegion {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
}

interface MapState {
    lastViewedRegion: MapRegion | null;
    lastTappedLocation: { latitude: number, longitude: number } | null;
    lastZoomLevel: number;
    lastRadius: number;
}

let store: MapState = {
    lastViewedRegion: null,
    lastTappedLocation: null,
    lastZoomLevel: 0,
    lastRadius: 0,
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getMapStore(): MapState {
    return { ...store };
}

export function subscribe(callback: Subscriber): () => void {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
}

function notifySubscribers() {
    subscribers.forEach(cb => cb());
}

export function setLastViewedRegion(region: MapRegion) {
    store.lastViewedRegion = region;
    notifySubscribers();
}

export function setLastTappedLocation(lat: number, lng: number) {
    store.lastTappedLocation = { latitude: lat, longitude: lng };
    notifySubscribers();
}

export function setMapMetrics(zoom: number, radius: number) {
    store.lastZoomLevel = zoom;
    store.lastRadius = radius;
    notifySubscribers();
}
```

---

## File: store/messaging.store.ts
```ts
/**
 * Messaging Store
 * In-memory storage for conversations and messages
 */

import { Message, Conversation, TypingState } from '../types/messaging.types';

interface MessagingState {
    conversations: Record<string, Conversation>;
    messagesByConversation: Record<string, Message[]>;
    activeConversationId: string | null;
    typingStates: Record<string, TypingState>; // userId_convId -> state
}

let store: MessagingState = {
    conversations: {},
    messagesByConversation: {},
    activeConversationId: null,
    typingStates: {},
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

/**
 * Add or update a conversation
 */
export function setConversation(conv: Conversation) {
    store.conversations[conv.conversationId] = conv;
    notifySubscribers();
}

/**
 * Add a message to a conversation
 */
export function addMessageToStore(message: Message) {
    const convId = message.conversationId;
    if (!store.messagesByConversation[convId]) {
        store.messagesByConversation[convId] = [];
    }
    store.messagesByConversation[convId].push(message);

    // Update conversation last message and activity
    const conv = store.conversations[convId];
    if (conv) {
        conv.lastMessage = {
            content: message.content,
            senderId: message.senderId,
            createdAt: message.createdAt
        };
        conv.lastActivityAt = message.createdAt;
        if (message.senderId !== 'currentUser') { // Simple mock check
            conv.unreadCount += 1;
        }
    }
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
 * Reset store
 */
export function resetMessagingStore() {
    store = {
        conversations: {},
        messagesByConversation: {},
        activeConversationId: null,
        typingStates: {},
    };
    notifySubscribers();
}
```

---

## File: store/notification.store.ts
```ts
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
```

---

## File: store/post.store.ts
```ts
/**
 * Post Store
 * State management for posts and feeds
 */

import { Post } from '../types/post.types';

interface PostStore {
    // Current feed posts
    feedPosts: Post[];

    // Posts from selected map location
    selectedLocationPosts: Post[];

    // User profile posts
    profilePosts: Post[];

    // Search results
    searchResults: Post[];

    // Pagination & Tiers (Puzzle 2)
    activeTier: string;
    offset: number;
    hasMore: boolean;

    // Map Interaction (Puzzle 4)
    mapSelectedLocation: { latitude: number; longitude: number } | null;

    // Search (Puzzle 6)
    searchResultsUsers: any[];

    // Loading states
    isLoading: boolean;
}

// Global state
let store: PostStore = {
    feedPosts: [],
    selectedLocationPosts: [],
    profilePosts: [],
    searchResults: [],
    searchResultsUsers: [],
    activeTier: 'local',
    offset: 0,
    hasMore: true,
    mapSelectedLocation: null,
    isLoading: false,
};

// Subscribers for state changes
type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

/**
 * Get current store state
 */
export function getPostStore(): PostStore {
    return { ...store };
}

/**
 * Subscribe to store changes
 */
export function subscribe(callback: Subscriber): () => void {
    subscribers.add(callback);

    // Return unsubscribe function
    return () => {
        subscribers.delete(callback);
    };
}

/**
 * Notify all subscribers of state change
 */
function notifySubscribers() {
    subscribers.forEach(callback => callback());
}

/**
 * Set feed posts
 */
export function setFeedPosts(posts: Post[], append: boolean = false) {
    if (append) {
        store.feedPosts = [...store.feedPosts, ...posts];
    } else {
        store.feedPosts = posts;
    }
    notifySubscribers();
}

/**
 * Set active tier
 */
export function setActiveTier(tier: string) {
    store.activeTier = tier;
    notifySubscribers();
}

/**
 * Set pagination offset
 */
export function setOffset(offset: number) {
    store.offset = offset;
    notifySubscribers();
}

/**
 * Set hasMore flag
 */
export function setHasMore(hasMore: boolean) {
    store.hasMore = hasMore;
    notifySubscribers();
}

/**
 * Set selected location posts (from map tap)
 */
export function setSelectedLocationPosts(posts: Post[]) {
    store.selectedLocationPosts = posts;
    notifySubscribers();
}

/**
 * Set profile posts
 */
export function setProfilePosts(posts: Post[]) {
    store.profilePosts = posts;
    notifySubscribers();
}

/**
 * Set search results
 */
export function setSearchResults(posts: Post[]) {
    store.searchResults = posts;
    notifySubscribers();
}

/**
 * Set search results users
 */
export function setSearchResultsUsers(users: any[]) {
    store.searchResultsUsers = users;
    notifySubscribers();
}

/**
 * Set map selected location
 */
export function setMapSelectedLocation(location: { latitude: number; longitude: number } | null) {
    store.mapSelectedLocation = location;
    notifySubscribers();
}

/**
 * Set loading state
 */
export function setLoading(loading: boolean) {
    store.isLoading = loading;
    notifySubscribers();
}

/**
 * Clear all posts
 */
export function clearAllPosts() {
    store.feedPosts = [];
    store.selectedLocationPosts = [];
    store.profilePosts = [];
    store.searchResults = [];
    store.offset = 0;
    store.hasMore = true;
    notifySubscribers();
}
```

---

## File: store/profile.store.ts
```ts
/**
 * Profile Store
 * Manages viewed user profiles and current user profile state
 */

import { User } from '../types/user.types';
import { Post } from '../types/post.types';

interface ProfileState {
    viewedProfile: User | null;
    profilePosts: Post[];
    currentUserProfile: User | null;
    isEditing: boolean;
}

let store: ProfileState = {
    viewedProfile: null,
    profilePosts: [],
    currentUserProfile: null,
    isEditing: false,
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getProfileStore(): ProfileState {
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
 * Set the profile currently being viewed
 */
export function setViewedProfile(user: User | null) {
    store.viewedProfile = user;
    notifySubscribers();
}

/**
 * Set the posts for the currently viewed profile
 */
export function setProfilePosts(posts: Post[]) {
    store.profilePosts = posts;
    notifySubscribers();
}

/**
 * Set current user's own profile
 */
export function setCurrentUserProfile(user: User | null) {
    store.currentUserProfile = user;
    notifySubscribers();
}

/**
 * Toggle edit mode
 */
export function setEditing(isEditing: boolean) {
    store.isEditing = isEditing;
    notifySubscribers();
}

/**
 * Locally update current user profile (Edit Profile)
 */
export function updateCurrentUserProfile(updates: Partial<User>) {
    if (store.currentUserProfile) {
        store.currentUserProfile = { ...store.currentUserProfile, ...updates };
        notifySubscribers();
    }
}
```

---

## File: store/reelsSession.store.ts
```ts
/**
 * Reels Session Store
 * Tracks in-memory session signals and watch history
 */

export interface WatchStats {
    totalDurationMs: number;
    playedSeconds: number;
    replayCount: number;
    percentWatched: number;
    isSkipped: boolean;
    isFinished: boolean;
}

interface SessionState {
    currentVideoId: string | null;
    watchHistory: Record<string, WatchStats>;
    sessionMetrics: {
        startTime: number;
        videosWatchedCount: number;
        totalWatchTimeMs: number;
    };
    // Retention multipliers
    modifiers: {
        noveltyWeight: number;
        radiusMultiplier: number;
    };
}

let store: SessionState = {
    currentVideoId: null,
    watchHistory: {},
    sessionMetrics: {
        startTime: Date.now(),
        videosWatchedCount: 0,
        totalWatchTimeMs: 0,
    },
    modifiers: {
        noveltyWeight: 1.0,
        radiusMultiplier: 1.0,
    }
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getReelsSessionStore(): SessionState {
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
 * Update current active video
 */
export function setCurrentVideo(postId: string) {
    if (store.currentVideoId !== postId) {
        store.currentVideoId = postId;
        store.sessionMetrics.videosWatchedCount++;

        // Initialize history if new
        if (!store.watchHistory[postId]) {
            store.watchHistory[postId] = {
                totalDurationMs: 0,
                playedSeconds: 0,
                replayCount: 0,
                percentWatched: 0,
                isSkipped: false,
                isFinished: false,
            };
        }

        // Dynamic retention logic
        updateRetentionModifiers();
        notifySubscribers();
    }
}

/**
 * Update stats for a specific video
 */
export function updateWatchStats(postId: string, stats: Partial<WatchStats>) {
    const current = store.watchHistory[postId];
    if (current) {
        store.watchHistory[postId] = { ...current, ...stats };
        if (stats.totalDurationMs) {
            store.sessionMetrics.totalWatchTimeMs += stats.totalDurationMs;
        }
        notifySubscribers();
    }
}

/**
 * Dynamic Retention Adjuster
 * As session deepens, we increase novelty and radius
 */
function updateRetentionModifiers() {
    const count = store.sessionMetrics.videosWatchedCount;

    // Every 5 videos, increase novelty and widen radius slightly
    if (count > 5) {
        store.modifiers.noveltyWeight = 1.0 + (Math.floor(count / 5) * 0.2);
        store.modifiers.radiusMultiplier = 1.0 + (Math.floor(count / 10) * 0.5);
    }
}

/**
 * Reset session
 */
export function resetSession() {
    store = {
        currentVideoId: null,
        watchHistory: {},
        sessionMetrics: {
            startTime: Date.now(),
            videosWatchedCount: 0,
            totalWatchTimeMs: 0,
        },
        modifiers: {
            noveltyWeight: 1.0,
            radiusMultiplier: 1.0,
        }
    };
    notifySubscribers();
}
```

---

## File: store/social.store.ts
```ts
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
```

---

## File: store/user.store.ts
```ts
/**
 * User Store
 * Manages cached user profiles
 */

import { User } from '../types/user.types';

interface UserStore {
    cachedUsers: Record<string, User>;
}

let store: UserStore = {
    cachedUsers: {},
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getUserStore(): UserStore {
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
 * Update a user in cache
 */
export function setCachedUser(user: User) {
    store.cachedUsers[user.id] = user;
    notifySubscribers();
}

/**
 * Bulk update users
 */
export function setCachedUsers(users: User[]) {
    users.forEach(u => {
        store.cachedUsers[u.id] = u;
    });
    notifySubscribers();
}
```
