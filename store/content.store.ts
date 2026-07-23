/**
 * Content Store
 * State management for posts and content metadata
 */

import { Post } from '../types/post.types';

interface ContentState {
    posts: Record<string, Post>;
    allPostIds: string[];
}

let store: ContentState = {
    posts: {},
    allPostIds: [],
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getContentStore(): ContentState {
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
 * Add or update a post in the store
 */
export function setPost(post: Post) {
    if (!store.posts[post.postId]) {
        store.allPostIds.push(post.postId);
    }
    store.posts[post.postId] = post;
    notifySubscribers();
}

/**
 * Bulk add posts
 */
export function setPosts(posts: Post[]) {
    posts.forEach(post => {
        if (!store.posts[post.postId]) {
            store.allPostIds.push(post.postId);
        }
        store.posts[post.postId] = post;
    });
    notifySubscribers();
}

/**
 * Get posts as array
 */
export function getPostsArray(): Post[] {
    return store.allPostIds.map(id => store.posts[id]);
}
