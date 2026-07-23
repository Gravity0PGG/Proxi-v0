/**
 * Feed Context Store
 * Manages the discovery context for the feed (e.g. location-based or default)
 */

import { TimeWindow } from '../types/post.types';

export interface FeedLocationContext {
    latitude: number;
    longitude: number;
}

interface FeedContextState {
    activeLocation: FeedLocationContext | null;
    activeRadius: number; // meters
    activeTimeWindow: TimeWindow;
    source: "map" | "default";
}

let store: FeedContextState = {
    activeLocation: null,
    activeRadius: 10000, // Default 10km
    activeTimeWindow: 'last24Hours',
    source: 'default',
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getFeedContextStore(): FeedContextState {
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
 * Set location-based discovery context
 */
export function setLocationContext(lat: number, lng: number, radius: number, timeWindow: TimeWindow = 'last24Hours') {
    store.activeLocation = { latitude: lat, longitude: lng };
    store.activeRadius = radius;
    store.activeTimeWindow = timeWindow;
    store.source = 'map';
    notifySubscribers();
}

/**
 * Reset to default (e.g. following/global)
 */
export function resetToDefaultContext() {
    store.activeLocation = null;
    store.activeRadius = 10000;
    store.activeTimeWindow = 'last24Hours';
    store.source = 'default';
    notifySubscribers();
}
