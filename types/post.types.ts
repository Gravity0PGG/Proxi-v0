/**
 * Core Content & Post Data Model
 */

export type MediaType = 'video' | 'image';

export interface PostLocation {
    latitude: number;
    longitude: number;
    geohash: string;
    city?: string;
    state?: string;
    country?: string;
}

export interface ViralityMetrics {
    engagementScore: number;
    velocityScore: number; // Growth rate
    lastEngagementAt: number;
}

export type TimeWindow = 'last24Hours' | 'last7Days' | 'older';

export interface Post {
    postId: string;
    creatorId: string;

    mediaUrl: string;
    mediaType: MediaType;
    caption?: string;

    createdAt: number; // unix timestamp (ms)

    location: PostLocation;
    visibilityRadius: number; // in meters

    // Engagement Counts
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    savesCount: number;
    viewsCount: number;
    watchTimeCount: number; // in seconds

    // Virality Tracking
    virality: ViralityMetrics;

    category?: string; // e.g. 'food', 'travel', 'tech'
}

export type CreatePostInput = Omit<Post, 'postId' | 'createdAt' | 'likesCount' | 'commentsCount' | 'sharesCount' | 'savesCount' | 'viewsCount' | 'virality'>;

export interface PostQuery {
    locationCenter?: {
        latitude: number;
        longitude: number;
    };
    radiusMeters?: number;
    timeWindow?: TimeWindow;
    creatorId?: string;
    limit?: number;
}
