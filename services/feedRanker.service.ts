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
function calculateSocialScore(post: Post, currentUserId: string): number {
    const social = getSocialStore();
    let score = 0;

    // A. Direct Relationships
    if (social.friends.includes(post.creatorId)) {
        score += 1500; // Mutual friends get highest boost
    } else if (social.following.includes(post.creatorId)) {
        score += 800;
    }

    // B. Messaging Affinity
    const messagingAffinity = getMessagingAffinitySync(currentUserId, post.creatorId);
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
import { getMessagingAffinitySync } from './messaging.service';

/**
 * Main Ranker Entry Point
 */
// Update rankFeed to accept currentUserId as first arg (or second)
export function rankFeed(
    currentUserId: string,
    userLocation: { latitude: number, longitude: number },
    limit: number = 50,
    radiusKm?: number
): string[] {
    let allPosts = getAllPosts();

    // Strictly filter by radius if provided (Map discovery mode)
    if (radiusKm && radiusKm < 20000) { // Don't filter if it's "globe" level
        allPosts = allPosts.filter(post => {
            const distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                post.location.latitude,
                post.location.longitude
            );
            return distance <= radiusKm;
        });
    }

    const session = getSessionFeedback();

    const scoredPosts = allPosts.map(post => {
        const timeScore = calculateTimeScore(post) * WEIGHTS.TIME;

        // 1. Proximity with Session Modifier (Widen radius if deep session)
        const effectiveLocation = userLocation;
        const proximityScore = calculateProximityScore(post, effectiveLocation) * WEIGHTS.PROXIMITY * session.radiusMultiplier;

        const socialScore = calculateSocialScore(post, currentUserId) * WEIGHTS.SOCIAL;
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
