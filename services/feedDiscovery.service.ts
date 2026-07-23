/**
 * Feed Discovery Service
 * Logic for requesting and refreshing the feed based on location context
 */

import { rankFeed } from './feedRanker.service';
import { setRankedFeed, setLoading } from '../store/feed.store';
import { TimeWindow } from '../types/post.types';

interface FeedRequestParams {
    lat: number;
    lng: number;
    radius: number;
    timeWindow?: TimeWindow;
}

/**
 * Request feed by location
 * Always prioritize last 24 hours, but ranking engine also handles viral 7d
 */
export async function requestFeedByLocation(params: FeedRequestParams) {
    setLoading(true);

    try {
        // Simulate minor async delay for ranking
        const rankedIds = rankFeed(
            'system',
            { latitude: params.lat, longitude: params.lng },
            50, // pool size
            params.radius / 1000 // meters to km
        );

        setRankedFeed(rankedIds);
    } catch (error) {
        console.error('Error requesting feed by location:', error);
        setLoading(false);
    }
}
