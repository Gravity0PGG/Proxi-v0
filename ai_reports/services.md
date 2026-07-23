# AI Review Report: Services

This report contains the full source code for all service layers in the project.

## File: services/api.ts
```ts
// API wrapper placeholder - no implementation yet
export const api = {
    // Will be implemented later
};
```

---

## File: services/auth.service.ts
```ts
// Auth service placeholder - no implementation yet
export const authService = {
    // Will be implemented later
};
```

---

## File: services/content.service.ts
```ts
/**
 * Content Service
 * Core logic for content management, virality, and time decay
 */

import { Post, TimeWindow, ViralityMetrics } from '../types/post.types';

/**
 * Calculate Engagement Score
 * Formula: (likes * 1) + (comments * 2) + (shares * 3) + (saves * 4)
 */
export function calculateEngagementScore(post: Post): number {
    return (
        post.likesCount * 1 +
        post.commentsCount * 2 +
        post.sharesCount * 3 +
        post.savesCount * 4
    );
}

/**
 * Calculate Velocity Score (Growth Rate)
 * Simple mock: engagement / hours since creation
 */
export function calculateVelocityScore(post: Post): number {
    const hoursSinceCreation = Math.max(1, (Date.now() - post.createdAt) / (1000 * 60 * 60));
    return calculateEngagementScore(post) / hoursSinceCreation;
}

/**
 * Classify content into Time Windows
 */
export function getTimeWindow(createdAt: number): TimeWindow {
    const now = Date.now();
    const diffHours = (now - createdAt) / (1000 * 60 * 60);

    if (diffHours <= 24) return 'last24Hours';
    if (diffHours <= 168) return 'last7Days'; // 7 * 24 = 168
    return 'older';
}

/**
 * Update virality metrics for a post
 */
export function updatePostVirality(post: Post): Post {
    return {
        ...post,
        virality: {
            engagementScore: calculateEngagementScore(post),
            velocityScore: calculateVelocityScore(post),
            lastEngagementAt: Date.now(),
        }
    };
}

/**
 * Create Mock Post Data for testing
 */
export function createMockPost(i: number): Post {
    const now = Date.now();
    const createdAt = now - (Math.random() * 10 * 24 * 60 * 60 * 1000); // random time up to 10 days ago

    const post: Post = {
        postId: `post_${i}`,
        creatorId: `user_${Math.floor(Math.random() * 10)}`,
        mediaUrl: `https://picsum.photos/seed/${i}/400/600`,
        mediaType: 'video',
        caption: `Awesome content #${i} from PROXI`,
        createdAt,
        location: {
            latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
            longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
            geohash: 'dr5rs',
            city: 'New York',
            state: 'NY',
            country: 'USA'
        },
        visibilityRadius: 5000,
        likesCount: Math.floor(Math.random() * 1000),
        commentsCount: Math.floor(Math.random() * 100),
        sharesCount: Math.floor(Math.random() * 50),
        savesCount: Math.floor(Math.random() * 30),
        viewsCount: Math.floor(Math.random() * 5000),
        watchTimeCount: Math.floor(Math.random() * 10000),
        virality: {
            engagementScore: 0,
            velocityScore: 0,
            lastEngagementAt: now,
        },
        category: ['food', 'travel', 'tech', 'fitness', 'music'][Math.floor(Math.random() * 5)]
    };

    return updatePostVirality(post);
}
```

---

## File: services/feed.service.ts
```ts
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
```

---

## File: services/feedDiscovery.service.ts
```ts
/**
 * Feed Discovery Service
 * Logic for requesting and refreshing the feed based on location context
 */

import { rankFeed } from './feedRanker.service';
import { setRankedFeed, setLoading } from '../store/feed.store';
import { TimeWindow } from '../types/post.types';

interface FeedRequestParams {
    lat: number;
    lng: number;
    radius: number;
    timeWindow?: TimeWindow;
}

/**
 * Request feed by location
 * Always prioritize last 24 hours, but ranking engine also handles viral 7d
 */
export async function requestFeedByLocation(params: FeedRequestParams) {
    setLoading(true);

    try {
        // Simulate minor async delay for ranking
        const rankedIds = rankFeed(
            { latitude: params.lat, longitude: params.lng },
            50 // pool size
        );

        setRankedFeed(rankedIds);
    } catch (error) {
        console.error('Error requesting feed by location:', error);
        setLoading(false);
    }
}
```

---

## File: services/feedRanker.service.ts
```ts
/**
 * Feed Ranker Service
 * Personalization & Proximity scoring engine
 */

import { Post } from '../types/post.types';
import { getSocialStore } from '../store/social.store';
import { getAllPosts } from './post.service';
import { calculateDistance } from '../utils/geohash.util';

/**
 * Ranking Weights
 */
const WEIGHTS = {
    TIME: 1.0,
    PROXIMITY: 0.8,
    SOCIAL: 1.5,
    ENGAGEMENT: 0.5,
};

/**
 * 1. Time Score
 * Priority: last 24h > viral 7d > older
 */
function calculateTimeScore(post: Post): number {
    const now = Date.now();
    const ageHours = (now - post.createdAt) / (1000 * 60 * 60);

    if (ageHours <= 24) return 1000;
    if (ageHours <= 168 && post.virality.engagementScore > 1000) return 500;
    return Math.max(0, 200 * (1 - ageHours / 720)); // Decay over 30 days
}

/**
 * 2. Proximity Score
 * Expansion Tiers mapping
 */
function calculateProximityScore(post: Post, userLocation: { latitude: number, longitude: number }): number {
    const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        post.location.latitude,
        post.location.longitude
    );

    if (distance <= 3) return 1000;      // 1-3km
    if (distance <= 10) return 800;     // 10km
    if (distance <= 50) return 600;     // City/Regional
    if (distance <= 500) return 400;    // State/Large Regional
    if (distance <= 2000) return 200;   // Country
    return 100;                         // International
}

/**
 * Advanced Social Relevance Boost
 */
function calculateSocialScore(post: Post): number {
    const social = getSocialStore();
    let score = 0;

    // A. Direct Relationships
    if (social.friends.includes(post.creatorId)) {
        score += 1500; // Mutual friends get highest boost
    } else if (social.following.includes(post.creatorId)) {
        score += 800;
    }

    // B. Messaging Affinity
    const messagingAffinity = getMessagingAffinity(post.creatorId);
    score += messagingAffinity;

    if (social.interactions.frequentlyMessagedUserIds.includes(post.creatorId)) {
        score += 500; // Additional boost for explicit frequency tag
    } else if (social.interactions.recentlyMessagedUserIds.includes(post.creatorId)) {
        score += 200;
    }

    // C. Friend Signals (Social Proof)
    if (social.interactions.contentLikedByFriends.includes(post.postId)) {
        score += 600;
    }
    if (social.interactions.contentViewedByFriends.includes(post.postId)) {
        score += 200;
    }

    // D. Category Interest Alignment
    if (post.category && social.interests.includes(post.category)) {
        score += 400;
    }

    return score;
}

/**
 * 4. Engagement & Virality Score
 * Growth velocity normalized by creator's perceived reach
 */
function calculateEngagementScore(post: Post): number {
    // Weighted raw engagement
    const rawScore =
        post.likesCount * 1 +
        post.commentsCount * 2 +
        post.sharesCount * 4 +
        post.savesCount * 5 +
        (post.watchTimeCount / 30) * 10; // Watch time weighted heavily

    // Growth velocity multiplier
    const velocityMultiplier = 1 + (post.virality.velocityScore * 2);

    return Math.min(rawScore * velocityMultiplier, 2000);
}

import { getSessionFeedback } from './reelsSession.service';
import { getMessagingAffinity } from './messaging.service';

/**
 * Main Ranker Entry Point
 */
export function rankFeed(
    userLocation: { latitude: number, longitude: number },
    limit: number = 50
): string[] {
    const allPosts = getAllPosts();
    const session = getSessionFeedback();

    const scoredPosts = allPosts.map(post => {
        const timeScore = calculateTimeScore(post) * WEIGHTS.TIME;

        // 1. Proximity with Session Modifier (Widen radius if deep session)
        const effectiveLocation = userLocation;
        const proximityScore = calculateProximityScore(post, effectiveLocation) * WEIGHTS.PROXIMITY * session.radiusMultiplier;

        const socialScore = calculateSocialScore(post) * WEIGHTS.SOCIAL;
        const engagementScore = calculateEngagementScore(post) * WEIGHTS.ENGAGEMENT;

        let totalScore = timeScore + proximityScore + socialScore + engagementScore;

        const isDiscovery = !getSocialStore().following.includes(post.creatorId);

        // 2. Novelty Boost from Session
        if (isDiscovery) {
            totalScore *= session.noveltyWeight;
        }

        return {
            postId: post.postId,
            creatorId: post.creatorId,
            totalScore,
            isDiscovery
        };
    });

    // Sort by total score
    const sorted = scoredPosts.sort((a, b) => b.totalScore - a.totalScore);

    // 5. Diversity & Exploration Logic
    const finalFeed: string[] = [];
    const creatorCount: Record<string, number> = {};
    let discoveryCount = 0;
    const baseDiscoveryRatio = 0.2;
    // Widen discovery ratio in deep sessions
    const DISCOVERY_TARGET_RATIO = session.isDeepSession ? 0.4 : baseDiscoveryRatio;

    for (const item of sorted) {
        if (finalFeed.length >= limit) break;

        const count = creatorCount[item.creatorId] || 0;
        const isDiscovery = item.isDiscovery;

        // Diversity Rule: Max 2 posts per creator
        if (count >= 2) continue;

        // Exploration Rule: Control discovery injection
        if (isDiscovery) {
            const currentRatio = discoveryCount / (finalFeed.length || 1);
            if (currentRatio > DISCOVERY_TARGET_RATIO && finalFeed.length > 5) {
                continue;
            }
            discoveryCount++;
        }

        finalFeed.push(item.postId);
        creatorCount[item.creatorId] = count + 1;
    }

    return finalFeed;
}
```

---

## File: services/map.service.ts
```ts
/**
 * Map Service
 * Bridge between map gestures and feed discovery logic
 */

import { setLastTappedLocation, setMapMetrics } from '../store/map.store';
import { setLocationContext } from '../store/feedContext.store';

/**
 * Zoom -> Radius Mapping (Meters)
 * Globe view (zoom 0-2) -> Country (2000km)
 * Country (zoom 3-5) -> State (500km)
 * State (zoom 6-9) -> City (50km)
 * City (zoom 10-13) -> 10km
 * Street (zoom 14-20) -> 1-3km
 */
export function getRadiusFromZoom(zoomLevel: number): number {
    if (zoomLevel <= 2) return 20000000; // Globe/International (20,000 km)
    if (zoomLevel <= 5) return 2000000;   // Country (2,000 km)
    if (zoomLevel <= 8) return 500000;    // State (500 km)
    if (zoomLevel <= 11) return 50000;    // City (50 km)
    if (zoomLevel <= 14) return 10000;    // 10km view
    return 3000;                          // Street level (3km)
}

/**
 * Helper to calculate pseudo zoom from latitudeDelta
 */
export function calculateZoomFromDelta(latDelta: number): number {
    return Math.round(Math.log2(360 / latDelta));
}

/**
 * Map Interaction Handlers
 */
export function onMapTap(lat: number, lng: number, latDelta: number) {
    const zoomLevel = calculateZoomFromDelta(latDelta);
    const radius = getRadiusFromZoom(zoomLevel);

    // 1. Store map interaction state
    setLastTappedLocation(lat, lng);
    setMapMetrics(zoomLevel, radius);

    // 2. Prepare feed discovery context
    setLocationContext(lat, lng, radius);

    return {
        lat,
        lng,
        radius,
        zoomLevel,
        timestamp: Date.now()
    };
}

export function onMapPan() {
    // Reserved for future "Search as I move" logic
}

export function onMapZoom() {
    // Reserved for future cluster expansion logic
}
```

---

## File: services/message.service.ts
```ts
// Message service placeholder - no implementation yet
export const messageService = {
    // Will be implemented later
};
```

---

## File: services/messaging.service.ts
```ts
/**
 * Messaging Service
 * Business logic for sending, receiving, and affinity calculations
 */

import { Message, Conversation, TypingState } from '../types/messaging.types';
import {
    getMessagingStore,
    addMessageToStore,
    setConversation,
    setTypingState
} from '../store/messaging.store';
import { trackMessaging } from '../store/social.store';

/**
 * Send a message
 */
export async function sendMessage(receiverId: string, content: string) {
    const store = getMessagingStore();
    const convId = getConversationId('currentUser', receiverId);

    // 1. Ensure conversation exists
    if (!store.conversations[convId]) {
        const newConv: Conversation = {
            conversationId: convId,
            participants: ['currentUser', receiverId],
            unreadCount: 0,
            lastActivityAt: Date.now()
        };
        setConversation(newConv);
    }

    const message: Message = {
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        conversationId: convId,
        senderId: 'currentUser',
        receiverId,
        content,
        createdAt: Date.now(),
        readAt: null,
        status: 'sent'
    };

    // 2. Add to store
    addMessageToStore(message);

    // 3. Update social affinity signals
    trackMessaging(receiverId, true); // Assuming sending messages counts towards affinity

    console.log(`[Messaging] Sent to ${receiverId}: ${content}`);

    return message;
}

import { NotificationTriggers } from './notification.service';

/**
 * Receive a message (mock)
 */
export function receiveMockMessage(senderId: string, content: string) {
    const convId = getConversationId('currentUser', senderId);

    const message: Message = {
        messageId: `msg_in_${Date.now()}`,
        conversationId: convId,
        senderId,
        receiverId: 'currentUser',
        content,
        createdAt: Date.now(),
        readAt: null,
        status: 'delivered'
    };

    addMessageToStore(message);
    trackMessaging(senderId, false); // Receiving messages also counts

    // Trigger Notification
    NotificationTriggers.onMessage(senderId, 'currentUser', content);

    console.log(`[Messaging] Received from ${senderId}: ${content}`);
}

/**
 * Calculate messaging affinity for a user
 */
export function getMessagingAffinity(userId: string): number {
    const store = getMessagingStore();
    const convId = getConversationId('currentUser', userId);
    const messages = store.messagesByConversation[convId] || [];

    if (messages.length === 0) return 0;

    // Recency (last 7 days weight)
    const now = Date.now();
    const recentMessages = messages.filter(m => now - m.createdAt < 7 * 24 * 60 * 60 * 1000);
    const recencyScore = recentMessages.length * 50;

    // Frequency
    const totalCount = messages.length;
    const frequencyScore = totalCount * 10;

    // Bidirectional strength
    const sentByMe = messages.filter(m => m.senderId === 'currentUser').length;
    const sentByThem = totalCount - sentByMe;
    const bidirectionalBonus = (sentByMe > 0 && sentByThem > 0) ? 500 : 0;

    return Math.min(recencyScore + frequencyScore + bidirectionalBonus, 2000);
}

/**
 * Handle typing state
 */
const typingTimeouts: Record<string, NodeJS.Timeout> = {};

export function reportTyping(receiverId: string) {
    const convId = getConversationId('currentUser', receiverId);
    const key = `currentUser_${convId}`;

    if (typingTimeouts[key]) {
        clearTimeout(typingTimeouts[key]);
    }

    setTypingState({
        userId: 'currentUser',
        conversationId: convId,
        isTyping: true,
        startedAt: Date.now()
    });

    typingTimeouts[key] = setTimeout(() => {
        setTypingState({
            userId: 'currentUser',
            conversationId: convId,
            isTyping: false,
            startedAt: Date.now()
        });
        delete typingTimeouts[key];
    }, 3000); // 3-second timeout
}

/**
 * Helper: Generate deterministic conv ID
 */
function getConversationId(id1: string, id2: string): string {
    return [id1, id2].sort().join('_');
}
```

---

## File: services/notification.service.ts
```ts
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
```

---

## File: services/post.service.ts
```ts
import { Post } from '../types/post.types';
import { encodeGeohash } from '../utils/geohash.util';
import { updatePostVirality } from './content.service';

// Mock user IDs
const MOCK_USER_IDS = [
    'user_001',
    'user_002',
    'user_003',
    'user_004',
    'user_005',
];

// Mock Users for search (Puzzle 6)
const MOCK_USERS: any[] = [
    { id: 'user_001', username: 'alex_explorer', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop', bio: '📍 Exploring the world' },
    { id: 'user_002', username: 'sarah_travels', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', bio: 'Beach lover 🌊' },
    { id: 'user_003', username: 'mike_hikes', avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop', bio: 'Mountain man ⛰️' },
    { id: 'user_004', username: 'emma_eats', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop', bio: 'Foodie 🍕' },
    { id: 'user_005', username: 'tech_tom', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop', bio: 'Gadget guy 📱' },
];

// Sample locations around the world
const SAMPLE_LOCATIONS = [
    { name: 'New York', lat: 40.7128, lon: -74.0060, city: 'New York', state: 'NY', country: 'USA' },
    { name: 'London', lat: 51.5074, lon: -0.1278, city: 'London', country: 'UK' },
    { name: 'Tokyo', lat: 35.6762, lon: 139.6503, city: 'Tokyo', country: 'Japan' },
    { name: 'Paris', lat: 48.8566, lon: 2.3522, city: 'Paris', country: 'France' },
    { name: 'Sydney', lat: -33.8688, lon: 151.2093, city: 'Sydney', country: 'Australia' },
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777, city: 'Mumbai', country: 'India' },
    { name: 'Dubai', lat: 25.2048, lon: 55.2708, city: 'Dubai', country: 'UAE' },
    { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, city: 'Los Angeles', state: 'CA', country: 'USA' },
    { name: 'Singapore', lat: 1.3521, lon: 103.8198, city: 'Singapore', country: 'Singapore' },
    { name: 'Berlin', lat: 52.5200, lon: 13.4050, city: 'Berlin', country: 'Germany' },
];

// Sample captions
const SAMPLE_CAPTIONS = [
    'Amazing view! 🌅',
    'Living my best life',
    'Can\'t believe I\'m here',
    'Perfect day ☀️',
    'Making memories',
    undefined, // Some posts have no caption
    'Beautiful!',
    'This place is incredible',
    'Loving this spot 💙',
    'Weekend vibes',
];

// Sample media URLs (placeholder images/videos)
const SAMPLE_MEDIA = [
    { url: 'https://picsum.photos/1080/1920?random=1', type: 'image' as const },
    { url: 'https://picsum.photos/1080/1920?random=2', type: 'image' as const },
    { url: 'https://picsum.photos/1080/1920?random=3', type: 'video' as const },
    { url: 'https://picsum.photos/1080/1920?random=4', type: 'image' as const },
    { url: 'https://picsum.photos/1080/1920?random=5', type: 'image' as const },
    { url: 'https://picsum.photos/1080/1920?random=6', type: 'video' as const },
    { url: 'https://picsum.photos/1080/1920?random=7', type: 'image' as const },
    { url: 'https://picsum.photos/1080/1920?random=8', type: 'image' as const },
];

/**
 * Generate random number of mock posts
 */
function generateMockPosts(count: number = 100): Post[] {
    const posts: Post[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
        const loc = SAMPLE_LOCATIONS[Math.floor(Math.random() * SAMPLE_LOCATIONS.length)];

        // Add some randomness to location
        const latOffset = (Math.random() - 0.5) * 0.1;
        const lonOffset = (Math.random() - 0.5) * 0.1;
        const lat = loc.lat + latOffset;
        const lon = loc.lon + lonOffset;

        const media = SAMPLE_MEDIA[Math.floor(Math.random() * SAMPLE_MEDIA.length)];
        const caption = SAMPLE_CAPTIONS[Math.floor(Math.random() * SAMPLE_CAPTIONS.length)];
        const creatorId = MOCK_USER_IDS[Math.floor(Math.random() * MOCK_USER_IDS.length)];

        // Timing distribution: 40% Fresh (<24h), 40% Recent (1-7 days), 20% Old
        const rand = Math.random();
        let createdAt: number;
        if (rand < 0.4) {
            createdAt = now - (Math.random() * 24 * 60 * 60 * 1000);
        } else if (rand < 0.8) {
            createdAt = now - (24 * 60 * 60 * 1000) - (Math.random() * 6 * 24 * 60 * 60 * 1000);
        } else {
            createdAt = now - (7 * 24 * 60 * 60 * 1000) - (Math.random() * 23 * 24 * 60 * 60 * 1000);
        }

        const engagementBoost = (rand >= 0.4 && rand < 0.8 && Math.random() > 0.7) ? 10 : 1;

        const post: Post = {
            postId: `post_${i + 1}`,
            creatorId,
            mediaUrl: media.url,
            mediaType: media.type,
            caption,
            location: {
                latitude: lat,
                longitude: lon,
                geohash: encodeGeohash(lat, lon),
                city: loc.city,
                state: loc.state,
                country: loc.country,
            },
            createdAt,
            visibilityRadius: 5000,
            likesCount: Math.floor(Math.random() * 1000 * engagementBoost),
            commentsCount: Math.floor(Math.random() * 50 * engagementBoost),
            sharesCount: Math.floor(Math.random() * 20 * engagementBoost),
            savesCount: Math.floor(Math.random() * 10 * engagementBoost),
            viewsCount: Math.floor(Math.random() * 5000 * engagementBoost),
            watchTimeCount: Math.floor(Math.random() * 10000 * engagementBoost), // random seconds
            virality: {
                engagementScore: 0,
                velocityScore: 0,
                lastEngagementAt: now,
            },
            category: ['food', 'travel', 'tech', 'fitness', 'music'][Math.floor(Math.random() * 5)]
        };

        posts.push(updatePostVirality(post));
    }

    return posts;
}

import { setPosts as setContentPosts } from '../store/content.store';

// In-memory mock database
let MOCK_POSTS: Post[] = generateMockPosts(200);

// Populate Content Store on load
setContentPosts(MOCK_POSTS);

/**
 * Get all posts (for testing)
 */
export function getAllPosts(): Post[] {
    return [...MOCK_POSTS];
}

/**
 * Get posts by user ID
 */
export function getPostsByUserId(userId: string): Post[] {
    return MOCK_POSTS.filter(post => post.creatorId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get post by ID
 */
export function getPostById(postId: string): Post | undefined {
    return MOCK_POSTS.find(post => post.postId === postId);
}

/**
 * Search posts by caption
 */
export function searchPosts(query: string): Post[] {
    const lowerQuery = query.toLowerCase();
    return MOCK_POSTS.filter(post =>
        post.caption?.toLowerCase().includes(lowerQuery)
    ).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Regenerate mock data (for testing)
 */
export function regenerateMockData(count: number = 100): void {
    MOCK_POSTS = generateMockPosts(count);
}

/**
 * Search users by username (Puzzle 6)
 */
export function searchUsers(query: string): any[] {
    const lowerQuery = query.toLowerCase();
    return MOCK_USERS.filter(user =>
        user.username.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Mock location search (Puzzle 6)
 */
export function getMockLocations(query: string): any[] {
    const lowerQuery = query.toLowerCase();
    return SAMPLE_LOCATIONS.filter(loc =>
        loc.name.toLowerCase().includes(lowerQuery)
    );
}
```

---

## File: services/profile.service.ts
```ts
/**
 * Profile Service
 * Logic for profile data fetching, follow actions, and post filtering
 */

import { User } from '../types/user.types';
import {
    setViewedProfile,
    setProfilePosts,
    updateCurrentUserProfile,
    getProfileStore
} from '../store/profile.store';
import { getPostsByUserId } from './post.service';
import { followUser, unfollowUser } from './social.service';

/**
 * Fetch and set all data required for a profile view
 */
export async function loadProfileData(userId: string) {
    // 1. Fetch posts by this user
    const posts = getPostsByUserId(userId);
    setProfilePosts(posts);

    // 2. Fetch user profile (In real app, this would be an API call)
    // For now, we simulate fetching from mock data or existing user store
    // Use the posts length to update postsCount

    return { posts };
}

/**
 * Follow a user and update local profile counts
 */
export async function followUserAction(targetId: string) {
    await followUser('currentUser', targetId);

    const store = getProfileStore();
    if (store.viewedProfile && store.viewedProfile.id === targetId) {
        setViewedProfile({
            ...store.viewedProfile,
            followerCount: store.viewedProfile.followerCount + 1
        });
    }

    if (store.currentUserProfile) {
        updateCurrentUserProfile({
            followingCount: store.currentUserProfile.followingCount + 1
        });
    }
}

/**
 * Unfollow a user and update local profile counts
 */
export async function unfollowUserAction(targetId: string) {
    await unfollowUser('currentUser', targetId);

    const store = getProfileStore();
    if (store.viewedProfile && store.viewedProfile.id === targetId) {
        setViewedProfile({
            ...store.viewedProfile,
            followerCount: Math.max(0, store.viewedProfile.followerCount - 1)
        });
    }

    if (store.currentUserProfile) {
        updateCurrentUserProfile({
            followingCount: Math.max(0, store.currentUserProfile.followingCount - 1)
        });
    }
}

/**
 * Update current user profile
 */
export function saveProfileEdits(updates: { displayName?: string, bio?: string, avatarUrl?: string }) {
    updateCurrentUserProfile(updates);
    console.log('[ProfileService] Profile updated locally:', updates);
}
```

---

## File: services/reelsSession.service.ts
```ts
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
    const store = getReelsSessionStore();
    const currentStats = store.watchHistory[postId];

    if (!currentStats) return;

    const newDuration = currentStats.totalDurationMs + durationMs;
    const playedSeconds = newDuration / 1000;
    const percentWatched = Math.min((playedSeconds / totalVideoLengthSec) * 100, 100);

    updateWatchStats(postId, {
        totalDurationMs: durationMs, // store.updateWatchStats adds this to session total internally if we want, or we just pass the delta
        playedSeconds,
        percentWatched,
        isSkipped: newDuration < SKIP_THRESHOLD_MS && percentWatched < 10,
        isFinished: percentWatched >= 99
    });

    console.log(`[ReelsPulse] ${postId}: ${percentWatched.toFixed(1)}% watched`);
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
```

---

## File: services/social.service.ts
```ts
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
```

---

## File: services/upload.service.ts
```ts
// Upload service placeholder - no implementation yet
export const uploadService = {
    // Will be implemented later
};
```

---

## File: services/user.service.ts
```ts
/**
 * User Service
 * Foundation layer for user profile management
 */

import { User } from '../types/user.types';
import { setCachedUser, setCachedUsers } from '../store/user.store';

// Mock database
const MOCK_USERS: Record<string, User> = {
    'user_001': {
        id: 'user_001',
        profileId: 'user_001',
        username: 'alex_explorer',
        displayName: 'Alex Explorer',
        profilePhotoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
        bio: '📍 Exploring the world through a lens\n📸 Digital Creator',
        location: { lat: 40.7128, lng: -74.0060, city: 'New York', state: 'NY', country: 'USA' },
        createdAt: Date.now() - 10000000,
        joinedAt: Date.now() - 10000000,
        isPrivate: false,
        isVerified: true,
        followerCount: 12400,
        followingCount: 842,
        postsCount: 42,
    },
    'user_002': {
        id: 'user_002',
        profileId: 'user_002',
        username: 'sarah_sky',
        displayName: 'Sarah Sky',
        profilePhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
        bio: 'Aviation lover ✈️',
        location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
        createdAt: Date.now() - 5000000,
        joinedAt: Date.now() - 5000000,
        isPrivate: true,
        isVerified: false,
        followerCount: 500,
        followingCount: 600,
        postsCount: 12,
    }
};

/**
 * Fetch a user profile by ID
 */
export async function getUserProfile(userId: string): Promise<User | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const user = MOCK_USERS[userId];
    if (user) {
        setCachedUser(user);
    }
    return user || null;
}

/**
 * Batch fetch users
 */
export async function getBatchProfiles(userIds: string[]): Promise<User[]> {
    const users = userIds.map(id => MOCK_USERS[id]).filter((u): u is User => !!u);
    setCachedUsers(users);
    return users;
}
```
