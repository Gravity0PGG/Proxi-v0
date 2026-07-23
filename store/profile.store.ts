/**
 * Profile Store
 * Manages viewed user profiles and current user profile state
 */

import { User } from '../types/user.types';
import { Post } from '../types/post.types';

interface ProfileState {
    viewedProfile: User | null;
    profilePosts: Post[];
    currentUserProfile: User | null;
    isEditing: boolean;
}

let store: ProfileState = {
    viewedProfile: null,
    profilePosts: [],
    currentUserProfile: null,
    isEditing: false,
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getProfileStore(): ProfileState {
    return { ...store };
}

export function subscribe(callback: Subscriber): () => void {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
}

function notifySubscribers() {
    subscribers.forEach(cb => cb());
}

/**
 * Set the profile currently being viewed
 */
export function setViewedProfile(user: User | null) {
    store.viewedProfile = user;
    notifySubscribers();
}

/**
 * Set the posts for the currently viewed profile
 */
export function setProfilePosts(posts: Post[]) {
    store.profilePosts = posts;
    notifySubscribers();
}

/**
 * Set current user's own profile
 */
export function setCurrentUserProfile(user: User | null) {
    store.currentUserProfile = user;
    notifySubscribers();
}

/**
 * Toggle edit mode
 */
export function setEditing(isEditing: boolean) {
    store.isEditing = isEditing;
    notifySubscribers();
}

/**
 * Locally update current user profile (Edit Profile)
 */
export function updateCurrentUserProfile(updates: Partial<User>) {
    if (store.currentUserProfile) {
        store.currentUserProfile = { ...store.currentUserProfile, ...updates };
        notifySubscribers();
    }
}
