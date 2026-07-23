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
