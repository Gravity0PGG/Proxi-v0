/**
 * Reels Session Service
 * Logic for processing watch-time signals and skip detection
 */

import { updateWatchStats, getReelsSessionStore } from '../store/reelsSession.store';

const SKIP_THRESHOLD_MS = 2000; // 2 seconds

/**
 * Report a pulse of watch time
 */
export function reportWatchTime(postId: string, durationMs: number, totalVideoLengthSec: number) {
    if (totalVideoLengthSec === 0) return;

    const store = getReelsSessionStore();
    const currentStats = store.watchHistory[postId];

    if (!currentStats) return;

    // FIX: Accumulate duration correctly. 
    // The previous implementation was adding durationMs to currentStats.totalDurationMs
    // but then passing ONLY durationMs to updateWatchStats.
    const newTotalDuration = currentStats.totalDurationMs + durationMs;
    const playedSeconds = newTotalDuration / 1000;
    const percentWatched = Math.min((playedSeconds / totalVideoLengthSec) * 100, 100);

    updateWatchStats(postId, {
        totalDurationMs: newTotalDuration, // This becomes the new total in the store
        playedSeconds,
        percentWatched,
        isSkipped: newTotalDuration < SKIP_THRESHOLD_MS && percentWatched < 10,
        isFinished: percentWatched >= 99
    });

    console.log(`[ReelsPulse] ${postId}: ${percentWatched.toFixed(1)}% watched (${playedSeconds.toFixed(1)}s / ${totalVideoLengthSec}s)`);
}

/**
 * Report a replay event
 */
export function reportReplay(postId: string) {
    const store = getReelsSessionStore();
    const currentStats = store.watchHistory[postId];

    if (currentStats) {
        updateWatchStats(postId, {
            replayCount: currentStats.replayCount + 1
        });
        console.log(`[ReelsReplay] ${postId}: Replay #${currentStats.replayCount + 1}`);
    }
}

/**
 * Calculate feedback for ranking engine based on current session
 */
export function getSessionFeedback() {
    const store = getReelsSessionStore();
    return {
        noveltyWeight: store.modifiers.noveltyWeight,
        radiusMultiplier: store.modifiers.radiusMultiplier,
        recentSkipsCount: Object.values(store.watchHistory).filter(s => s.isSkipped).length,
        isDeepSession: store.sessionMetrics.videosWatchedCount > 10
    };
}
