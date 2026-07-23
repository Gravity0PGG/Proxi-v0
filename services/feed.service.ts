import { Post, PostQuery, TimeWindow } from '../types/post.types';
import { getAllPosts, getPostsByUserId } from './post.service';
import { calculateDistance } from '../utils/geohash.util';

/**
 * Internal helpers to bridge to post service
 */
const getAllPostsInternal = getAllPosts;
const getPostsByUserIdInternal = getPostsByUserId;

/**
 * Proximity tiers for adaptive feed logic
 */
export const PROXIMITY_TIERS = [
    { label: 'local', radiusKm: 3 },
    { label: 'nearby', radiusKm: 10 },
    { label: 'city', radiusKm: 25 },
    { label: 'state', radiusKm: 200 },
    { label: 'country', radiusKm: 1000 },
    { label: 'global', radiusKm: Infinity },
];

/**
 * Get posts by location (Map → Feed flow)
 * Returns posts within a radius of the given coordinates
 */
export function getPostsByLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    limit: number = 20
): Post[] {
    const allPosts = getAllPosts();

    // Calculate distance for each post and filter by radius
    const postsWithDistance = allPosts
        .map(post => ({
            post,
            distance: calculateDistance(
                latitude,
                longitude,
                post.location.latitude,
                post.location.longitude
            ),
        }))
        .filter(item => item.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance); // Closest first

    return postsWithDistance
        .slice(0, limit)
        .map(item => item.post);
}

/**
 * Get nearby posts (Proximity-based feed)
 * Similar to getPostsByLocation but sorted by recency after distance filter
 */
export function getNearbyPosts(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    limit: number = 50
): Post[] {
    const allPosts = getAllPosts();

    // Filter by radius
    const nearbyPosts = allPosts.filter(post => {
        const distance = calculateDistance(
            latitude,
            longitude,
            post.location.latitude,
            post.location.longitude
        );
        return distance <= radiusKm;
    });

    // Sort by recency (newest first)
    return nearbyPosts
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
}

/**
 * Get user's posts (Profile view)
 */
export function getUserPosts(userId: string, limit: number = 50): Post[] {
    return getPostsByUserIdInternal(userId).slice(0, limit);
}

/**
 * Search posts (Search results)
 * Combines caption search with optional location filtering
 */
export function searchPostsQuery(query: PostQuery): Post[] {
    let results: Post[] = [];

    // Start with all posts or user-specific posts
    if (query.creatorId) {
        results = getPostsByUserId(query.creatorId);
    } else {
        results = getAllPostsInternal();
    }

    // Apply location filter if provided
    if (query.locationCenter) {
        const { latitude, longitude } = query.locationCenter;
        const radiusMeters = query.radiusMeters || 10000;
        results = results.filter(post => {
            const distance = calculateDistance(
                latitude,
                longitude,
                post.location.latitude,
                post.location.longitude
            );
            return (distance * 1000) <= radiusMeters;
        });
    }

    // Apply limit
    const limit = query.limit || 50;
    return results.slice(0, limit);
}

/**
 * Get posts for a specific geohash prefix
 * Useful for clustering posts on map view
 */
export function getPostsByGeohash(geohashPrefix: string, limit: number = 100): Post[] {
    const allPosts = getAllPosts();

    return allPosts
        .filter(post => post.location.geohash.startsWith(geohashPrefix))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
}

/**
 * Get trending posts
 * Weighted algorithm: uses virality engagement score
 */
export function getTrendingPosts(limit: number = 20): Post[] {
    const allPosts = getAllPostsInternal();

    return allPosts
        .sort((a, b) => b.virality.engagementScore - a.virality.engagementScore)
        .slice(0, limit);
}

/**
 * Get adaptive feed (Proximity Tiers algorithm)
 * Expands radius through tiers until the limit is reached or all tiers are exhausted
 */
export function getAdaptiveFeed(
    latitude: number,
    longitude: number,
    limit: number = 20
): { posts: Post[]; tier: string } {
    const allPosts = getAllPostsInternal();
    let results: Post[] = [];
    let currentTier = PROXIMITY_TIERS[0];

    for (const tier of PROXIMITY_TIERS) {
        currentTier = tier;

        // Filter posts within this tier's radius
        const tierPosts = allPosts.filter(post => {
            const distance = calculateDistance(
                latitude,
                longitude,
                post.location.latitude,
                post.location.longitude
            );
            return tier.radiusKm === Infinity ? true : distance <= tier.radiusKm;
        });

        // If we have enough posts, or this is the final (global) tier
        if (tierPosts.length >= limit || tier.radiusKm === Infinity) {
            results = tierPosts
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, limit);
            break;
        }
    }

    return {
        posts: results,
        tier: currentTier.label
    };
}

/**
 * Get Intelligent Reels Feed (Puzzle 3)
 * finalScore = timeWeight + proximityWeight + viralWeight
 */
export function getIntelligentFeed(
    latitude: number,
    longitude: number,
    limit: number = 20,
    offset: number = 0
): Post[] {
    const allPosts = getAllPostsInternal();
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // 1. Candidate Selection
    // Candidates are Fresh (24h) + Viral (7d)
    const candidates = allPosts.filter(post => {
        const isFresh = post.createdAt >= oneDayAgo;
        const isViralCandidate = post.createdAt >= sevenDaysAgo && post.virality.engagementScore > 1000;
        return isFresh || isViralCandidate;
    });

    // 2. Ranking Logic
    const scoredPosts = candidates.map(post => {
        let score = 0;

        // A. Time Weight (🟢 Fresh Priority)
        if (post.createdAt >= oneDayAgo) {
            score += 2000;
        }

        // B. Proximity Weight (Respect location)
        const distance = calculateDistance(
            latitude,
            longitude,
            post.location.latitude,
            post.location.longitude
        );
        // Exponential decay: Max 1000 for local, 0 at 200km
        score += Math.max(0, 1000 * (1 - distance / 200));

        // C. Viral Weight (Foundation Signal)
        score += Math.min(post.virality.engagementScore * 0.2, 1000);

        return { post, score, viralScore: post.virality.engagementScore };
    });

    // 3. Sorting
    const sorted = scoredPosts.sort((a, b) => b.score - a.score);

    // 4. Composition Rules (Viral Injection)
    const finalFeed: Post[] = [];
    const viralPool = sorted.filter(p => p.viralScore > 2000);
    const regularPool = sorted.filter(p => !viralPool.includes(p));

    let vIdx = 0;
    let rIdx = 0;

    for (let i = 0; i < sorted.length; i++) {
        const shouldInjectViral = i > 0 && i % 5 === 0;
        if (shouldInjectViral && vIdx < viralPool.length) {
            finalFeed.push(viralPool[vIdx++].post);
        } else if (rIdx < regularPool.length) {
            finalFeed.push(regularPool[rIdx++].post);
        }
    }

    return finalFeed.slice(offset, offset + limit);
}

/**
 * Get Puzzle 2 Feed (Proximity + Time Expansion)
 * 1. Strictly filter for last 24 hours.
 * 2. Expand radius through tiers until limit is met.
 * 3. Return posts sorted by newest first.
 */
export function getPuzzle2Feed(
    latitude: number,
    longitude: number,
    limit: number = 20,
    offset: number = 0
): { posts: Post[]; activeTier: string; hasMore: boolean } {
    const allPosts = getAllPostsInternal();
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    // Filter ALL posts that are within 24 hours first (Strict Rule)
    const freshPosts = allPosts.filter(post => post.createdAt >= oneDayAgo);

    let candidates: Post[] = [];
    let activeTier = PROXIMITY_TIERS[0].label;

    for (const tier of PROXIMITY_TIERS) {
        activeTier = tier.label;

        const tierPosts = freshPosts.filter(post => {
            const distance = calculateDistance(
                latitude,
                longitude,
                post.location.latitude,
                post.location.longitude
            );
            return tier.radiusKm === Infinity ? true : distance <= tier.radiusKm;
        });

        // Expand radius until we have enough items for the current page
        if (tierPosts.length >= (offset + limit) || tier.radiusKm === Infinity) {
            candidates = tierPosts.sort((a, b) => b.createdAt - a.createdAt);
            break;
        }
    }

    const results = candidates.slice(offset, offset + limit);
    const hasMore = candidates.length > (offset + limit);

    return {
        posts: results,
        activeTier,
        hasMore
    };
}
