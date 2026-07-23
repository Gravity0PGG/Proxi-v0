import { Post } from '../types/post.types';
import { encodeGeohash } from '../utils/geohash.util';
import { updatePostVirality } from './content.service';
import { setPosts as setContentPosts } from '../store/content.store';

// Sample locations for location search only (no mock media)
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

// Empty posts array - no mock data
let posts: Post[] = [];

// Initialize content store with empty array
setContentPosts(posts);

/**
 * Get all posts
 */
export function getAllPosts(): Post[] {
    return [...posts];
}

/**
 * Get posts by user ID
 */
export function getPostsByUserId(userId: string): Post[] {
    return posts.filter(post => post.creatorId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get post by ID
 */
export function getPostById(postId: string): Post | undefined {
    return posts.find(post => post.postId === postId);
}

/**
 * Search posts by caption
 */
export function searchPosts(query: string): Post[] {
    const lowerQuery = query.toLowerCase();
    return posts.filter(post =>
        post.caption?.toLowerCase().includes(lowerQuery)
    ).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Search users - returns empty until Supabase search is implemented
 */
export function searchUsers(query: string): any[] {
    // TODO: Implement real Supabase user search
    return [];
}

/**
 * Location search (keeps sample locations for map functionality)
 */
export function getMockLocations(query: string): any[] {
    const lowerQuery = query.toLowerCase();
    return SAMPLE_LOCATIONS.filter(loc =>
        loc.name.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Add a new post (for when user creates content)
 */
export function addPost(post: Post): void {
    posts.unshift(updatePostVirality(post));
    setContentPosts([...posts]);
}
