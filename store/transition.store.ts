/**
 * Transition Store
 * Manages the shared value and state for seamless Map-to-Feed transition
 */

import { makeMutable, SharedValue } from 'react-native-reanimated';

interface TransitionState {
    progress: SharedValue<number>; // 0 = Map, 1 = Feed
    touchX: SharedValue<number>;
    touchY: SharedValue<number>;
    isAnimating: boolean;
    targetLocation: { latitude: number; longitude: number } | null;
}

// Global mutable shared values for Reanimated
const progress = makeMutable(0);
const touchX = makeMutable(0);
const touchY = makeMutable(0);

let store: Omit<TransitionState, 'progress' | 'touchX' | 'touchY'> = {
    isAnimating: false,
    targetLocation: null,
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getTransitionStore() {
    return {
        ...store,
        progress,
        touchX,
        touchY,
    };
}

export function subscribe(callback: Subscriber): () => void {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
}

function notifySubscribers() {
    subscribers.forEach(cb => cb());
}

export function startTransition(lat: number, lng: number, x: number = 0, y: number = 0) {
    store.isAnimating = true;
    store.targetLocation = { latitude: lat, longitude: lng };
    touchX.value = x;
    touchY.value = y;
    notifySubscribers();
}

export function endTransition() {
    store.isAnimating = false;
    store.targetLocation = null;
    notifySubscribers();
}

export function setTransitionProgress(value: number) {
    progress.value = value;
}
