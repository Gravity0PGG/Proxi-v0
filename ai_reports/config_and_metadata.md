# AI Review Report: Config and Metadata

This report contains the project configuration, type definitions, and utility functions.

## File: app.json
```json
{
  "expo": {
    "name": "PROXI",
    "slug": "proxi",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": false,
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

---

## File: package.json
```json
{
  "name": "proxi",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "private": true,
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~54.0.29",
    "expo-router": "~6.0.20",
    "expo-secure-store": "~15.0.8",
    "expo-status-bar": "~3.0.9",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-maps": "1.20.1"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "typescript": "~5.9.2"
  }
}
```

---

## File: types/post.types.ts
```ts
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
```

---

## File: types/user.types.ts
```ts
export interface User {
    id: string;
    profileId: string; // Alias for id for explicit profile context
    username: string;
    displayName: string;
    profilePhotoUrl: string;
    avatarUrl?: string; // Standardize on avatarUrl
    bio: string;
    location?: {
        lat: number;
        lng: number;
        city?: string;
        state?: string;
        country?: string;
    };
    createdAt: number;
    joinedAt: number; // For profile display
    isPrivate: boolean;
    isVerified: boolean;
    followerCount: number;
    followingCount: number;
    postsCount: number;
}

export type CreateUserInput = Omit<User, 'id' | 'profileId' | 'createdAt' | 'joinedAt' | 'followerCount' | 'followingCount' | 'postsCount'>;
```

---

## File: types/messaging.types.ts
```ts
/**
 * Messaging System Types
 */

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
    messageId: string;
    conversationId: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: number;
    readAt: number | null;
    status: MessageStatus;
}

export interface Conversation {
    conversationId: string;
    participants: string[]; // userIds
    lastMessage?: {
        content: string;
        senderId: string;
        createdAt: number;
    };
    unreadCount: number;
    lastActivityAt: number;
}

export interface TypingState {
    userId: string;
    conversationId: string;
    isTyping: boolean;
    startedAt: number;
}
```

---

## File: types/notification.types.ts
```ts
/**
 * Notification Types
 */

export type NotificationType = 'like' | 'comment' | 'follow' | 'message' | 'mention';

export interface Notification {
    notificationId: string;
    type: NotificationType;
    actorUserId: string;
    targetUserId: string;
    relatedPostId?: string;
    content?: string; // Optional snippet of message/comment
    createdAt: number;
    isRead: boolean;
}
```

---

## File: types/social.types.ts
```ts
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
```

---

## File: utils/geohash.util.ts
```ts
/**
 * Geohash Utility
 * Simple geohash encoding for location-based post indexing
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode latitude and longitude to a geohash string
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param precision - Length of geohash string (default: 7, ~150m precision)
 * @returns Geohash string
 */
export function encodeGeohash(
    latitude: number,
    longitude: number,
    precision: number = 7
): string {
    let geohash = '';
    let even = true;
    let bit = 0;
    let ch = 0;

    let latMin = -90, latMax = 90;
    let lonMin = -180, lonMax = 180;

    while (geohash.length < precision) {
        if (even) {
            // Longitude
            const mid = (lonMin + lonMax) / 2;
            if (longitude > mid) {
                ch |= (1 << (4 - bit));
                lonMin = mid;
            } else {
                lonMax = mid;
            }
        } else {
            // Latitude
            const mid = (latMin + latMax) / 2;
            if (latitude > mid) {
                ch |= (1 << (4 - bit));
                latMin = mid;
            } else {
                latMax = mid;
            }
        }

        even = !even;

        if (bit < 4) {
            bit++;
        } else {
            geohash += BASE32[ch];
            bit = 0;
            ch = 0;
        }
    }

    return geohash;
}

/**
 * Calculate geohash precision based on map zoom level
 * Higher zoom = more precision needed
 * @param zoomLevel - Map zoom level (0-20)
 * @returns Geohash precision (1-9)
 */
export function getPrecisionFromZoom(zoomLevel: number): number {
    if (zoomLevel >= 16) return 9; // ~5m
    if (zoomLevel >= 13) return 8; // ~20m
    if (zoomLevel >= 10) return 7; // ~150m
    if (zoomLevel >= 7) return 6;  // ~1.2km
    if (zoomLevel >= 4) return 5;  // ~5km
    return 4; // ~20km
}

/**
 * Calculate approximate distance between two coordinates (Haversine formula)
 * @param lat1 - Latitude of point 1
 * @param lon1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lon2 - Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
```

---

## File: utils/constants.ts
```ts
// Constants placeholder - no implementation yet
export const APP_NAME = 'PROXI';
```

---

## File: utils/distance.ts
```ts
// Distance utility placeholder - no implementation yet
export const calculateDistance = () => {
    // Will be implemented later
};
```

---

## File: utils/permissions.ts
```ts
// Permissions utility placeholder - no implementation yet
export const requestLocationPermission = () => {
    // Will be implemented later
};
```
