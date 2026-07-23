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
