/**
 * Map Service
 * Bridge between map gestures and feed discovery logic
 */

import { setLastTappedLocation, setMapMetrics } from '../store/map.store';
import { setLocationContext } from '../store/feedContext.store';

/**
 * Zoom -> Radius Mapping (Meters)
 * Globe view (zoom 0-2) -> Country (2000km)
 * Country (zoom 3-5) -> State (500km)
 * State (zoom 6-9) -> City (50km)
 * City (zoom 10-13) -> 10km
 * Street (zoom 14-20) -> 1-3km
 */
export function getRadiusFromZoom(zoomLevel: number): number {
    if (zoomLevel <= 2) return 20000000; // Globe/International (20,000 km)
    if (zoomLevel <= 5) return 2000000;   // Country (2,000 km)
    if (zoomLevel <= 8) return 500000;    // State (500 km)
    if (zoomLevel <= 11) return 50000;    // City (50 km)
    if (zoomLevel <= 14) return 10000;    // 10km view
    return 3000;                          // Street level (3km)
}

/**
 * Helper to calculate pseudo zoom from latitudeDelta
 */
export function calculateZoomFromDelta(latDelta: number): number {
    return Math.round(Math.log2(360 / latDelta));
}

/**
 * Map Interaction Handlers
 */
export function onMapTap(lat: number, lng: number, latDelta: number) {
    const zoomLevel = calculateZoomFromDelta(latDelta);
    const radius = getRadiusFromZoom(zoomLevel);

    // 1. Store map interaction state
    setLastTappedLocation(lat, lng);
    setMapMetrics(zoomLevel, radius);

    // 2. Prepare feed discovery context
    setLocationContext(lat, lng, radius);

    return {
        lat,
        lng,
        radius,
        zoomLevel,
        timestamp: Date.now()
    };
}

export function onMapPan() {
    // Reserved for future "Search as I move" logic
}

export function onMapZoom() {
    // Reserved for future cluster expansion logic
}
