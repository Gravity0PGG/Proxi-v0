/**
 * User Store
 * Manages cached user profiles
 */

import { User } from '../types/user.types';

interface UserStore {
    cachedUsers: Record<string, User>;
}

let store: UserStore = {
    cachedUsers: {},
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getUserStore(): UserStore {
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
 * Update a user in cache
 */
export function setCachedUser(user: User) {
    store.cachedUsers[user.id] = user;
    notifySubscribers();
}

/**
 * Bulk update users
 */
export function setCachedUsers(users: User[]) {
    users.forEach(u => {
        store.cachedUsers[u.id] = u;
    });
    notifySubscribers();
}
