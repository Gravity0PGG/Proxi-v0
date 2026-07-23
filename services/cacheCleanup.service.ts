/**
 * Cache Cleanup Service
 * Automatically cleans up old cached media files to save storage
 * Text messages are kept forever, only media files are cleaned up
 */

import * as FileSystem from 'expo-file-system/legacy';

// Media cache expiry in days
const MEDIA_EXPIRY_DAYS = 30;

/**
 * Clean up old media cache files
 * Runs on app startup (non-blocking)
 */
export async function cleanupOldMediaCache(): Promise<{ deleted: number; errors: number }> {
    const result = { deleted: 0, errors: 0 };

    try {
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) {
            console.log('[CacheCleanup] No cache directory available');
            return result;
        }

        const expiryTime = Date.now() - (MEDIA_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        // Get list of cached files
        const files = await FileSystem.readDirectoryAsync(cacheDir);

        for (const fileName of files) {
            try {
                const filePath = `${cacheDir}${fileName}`;
                const fileInfo = await FileSystem.getInfoAsync(filePath);

                if (!fileInfo.exists || fileInfo.isDirectory) continue;

                // Check if file is a media file (images/videos)
                const isMedia = /\.(jpg|jpeg|png|gif|webp|mp4|mov|webm|heic)$/i.test(fileName);
                if (!isMedia) continue;

                // Check modification time
                const modTime = fileInfo.modificationTime ? fileInfo.modificationTime * 1000 : 0;

                if (modTime > 0 && modTime < expiryTime) {
                    await FileSystem.deleteAsync(filePath, { idempotent: true });
                    result.deleted++;
                    console.log(`[CacheCleanup] Deleted old file: ${fileName}`);
                }
            } catch (fileError) {
                result.errors++;
            }
        }

        // Also clean up expo-image cache directory if it exists
        const imageCacheDir = `${cacheDir}expo-image/`;
        try {
            const imageCacheInfo = await FileSystem.getInfoAsync(imageCacheDir);
            if (imageCacheInfo.exists && imageCacheInfo.isDirectory) {
                const imageFiles = await FileSystem.readDirectoryAsync(imageCacheDir);

                for (const fileName of imageFiles) {
                    try {
                        const filePath = `${imageCacheDir}${fileName}`;
                        const fileInfo = await FileSystem.getInfoAsync(filePath);

                        if (!fileInfo.exists || fileInfo.isDirectory) continue;

                        const modTime = fileInfo.modificationTime ? fileInfo.modificationTime * 1000 : 0;

                        if (modTime > 0 && modTime < expiryTime) {
                            await FileSystem.deleteAsync(filePath, { idempotent: true });
                            result.deleted++;
                        }
                    } catch (e) {
                        result.errors++;
                    }
                }
            }
        } catch (e) {
            // Image cache dir may not exist, that's fine
        }

        if (result.deleted > 0) {
            console.log(`[CacheCleanup] Completed: ${result.deleted} files deleted, ${result.errors} errors`);
        } else {
            console.log('[CacheCleanup] No old media files to clean up');
        }

        return result;
    } catch (error) {
        console.error('[CacheCleanup] Error during cleanup:', error);
        return result;
    }
}

/**
 * Get cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
    try {
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) return 0;

        const files = await FileSystem.readDirectoryAsync(cacheDir);
        let totalSize = 0;

        for (const fileName of files) {
            try {
                const filePath = `${cacheDir}${fileName}`;
                const fileInfo = await FileSystem.getInfoAsync(filePath);

                if (fileInfo.exists && !fileInfo.isDirectory && fileInfo.size) {
                    totalSize += fileInfo.size;
                }
            } catch (e) {
                // Skip files we can't read
            }
        }

        return totalSize;
    } catch (error) {
        console.error('[CacheCleanup] Error getting cache size:', error);
        return 0;
    }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Clear all cache (for settings/debug)
 */
export async function clearAllCache(): Promise<boolean> {
    try {
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) return false;

        const files = await FileSystem.readDirectoryAsync(cacheDir);

        for (const fileName of files) {
            try {
                const filePath = `${cacheDir}${fileName}`;
                await FileSystem.deleteAsync(filePath, { idempotent: true });
            } catch (e) {
                // Continue on error
            }
        }

        console.log('[CacheCleanup] All cache cleared');
        return true;
    } catch (error) {
        console.error('[CacheCleanup] Error clearing cache:', error);
        return false;
    }
}
