/**
 * Time formatting utility for chat status
 */

/**
 * Format a timestamp to show relative time (e.g., "5m ago", "2h ago")
 */
export function formatLastSeen(timestamp: number | null): string {
    if (!timestamp) return 'was online recently';

    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
        return 'was online just now';
    } else if (diffMinutes < 60) {
        return `was online ${diffMinutes}m ago`;
    } else if (diffHours < 24) {
        return `was online ${diffHours}h ago`;
    } else if (diffDays === 1) {
        return 'was online yesterday';
    } else {
        return `was online ${diffDays}d ago`;
    }
}

/**
 * Update current user's last_seen timestamp in Supabase
 */
import { supabase } from '../services/supabase';

export async function updateLastSeen(userId: string): Promise<void> {
    // Validate UUID format before sending to DB to avoid 22P02 errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
        console.log('[TimeUtil] Skipping last_seen update for non-UUID user:', userId);
        return;
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            // Suppress schema errors (e.g. column missing) or invalid UUIDs that slipped through
            if (error.code !== 'PGRST204' && error.code !== '22P02') {
                console.warn('Error updating last_seen:', error.message);
            }
        }
    } catch (err) {
        // Silently fail for optional status updates
    }
}
