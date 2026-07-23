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
