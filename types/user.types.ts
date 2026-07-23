export interface User {
    id: string;
    profileId: string; // Alias for id for explicit profile context
    email?: string; // User's email from auth
    username: string | null; // Nullable for new users in progressive onboarding
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
    signupNumber?: number; // User's signup order (e.g., #1 = first user, #42 = 42nd user)
}

export type CreateUserInput = Omit<User, 'id' | 'profileId' | 'createdAt' | 'joinedAt' | 'followerCount' | 'followingCount' | 'postsCount'>;
