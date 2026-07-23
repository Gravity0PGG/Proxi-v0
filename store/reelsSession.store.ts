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
