/**
 * Social Graph & Relationship Types
 */

export interface SocialRelationship {
    userId: string;
    targetId: string;
    status: 'following' | 'blocked' | 'muted';
    createdAt: number;
}

export interface InteractionGraph {
    followedUserIds: string[];
    messagedUserIds: string[];
    likedUserIds: string[]; // Users whose content I like
    friendsInteractedUserIds: string[]; // Users my friends interact with

    // New affinity signals
    recentlyMessagedUserIds: string[];
    frequentlyMessagedUserIds: string[];
    contentLikedByFriends: string[]; // Post IDs
    contentViewedByFriends: string[]; // Post IDs
    engagedCategoryCounts: Record<string, number>;
}

export interface SocialGraphState {
    followers: string[]; // List of userIds following current user
    following: string[]; // List of userIds current user is following
    friends: string[];   // Mutual follows
    interests: string[]; // Category interests
    interactions: InteractionGraph;
}
