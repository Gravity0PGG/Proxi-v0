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
 * Simple: engagement / hours since creation
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
