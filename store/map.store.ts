/**
 * Map Store
 * Tracks the state of the map viewport and user interactions
 */

export interface MapRegion {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
}

interface MapState {
    lastViewedRegion: MapRegion | null;
    lastTappedLocation: { latitude: number, longitude: number } | null;
    lastZoomLevel: number;
    lastRadius: number;
}

let store: MapState = {
    lastViewedRegion: null,
    lastTappedLocation: null,
    lastZoomLevel: 0,
    lastRadius: 0,
};

type Subscriber = () => void;
const subscribers: Set<Subscriber> = new Set();

export function getMapStore(): MapState {
    return { ...store };
}

export function subscribe(callback: Subscriber): () => void {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
}

function notifySubscribers() {
    subscribers.forEach(cb => cb());
}

export function setLastViewedRegion(region: MapRegion) {
    store.lastViewedRegion = region;
    notifySubscribers();
}

export function setLastTappedLocation(lat: number, lng: number) {
    store.lastTappedLocation = { latitude: lat, longitude: lng };
    notifySubscribers();
}

export function setMapMetrics(zoom: number, radius: number) {
    store.lastZoomLevel = zoom;
    store.lastRadius = radius;
    notifySubscribers();
}
