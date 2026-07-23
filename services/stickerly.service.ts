import * as FileSystem from 'expo-file-system';
import { saveStickerPack, StickerPack } from './stickerDatabase';

const API_V3 = 'http://api.sticker.ly/v3.1/stickerPack';
const API_V1 = 'http://api.sticker.ly/v1/stickerPack';

export const downloadStickerPack = async (inputCode: string) => {
    try {
        // 1. Extract Code
        let code = inputCode.trim();
        // Handle URL input: https://sticker.ly/s/ABCDEF or http://sticker.ly/s/ABCDEF
        // Also handle "share code" text that might be pasted
        const urlMatch = code.match(/sticker\.ly\/s\/([a-zA-Z0-9]+)/);
        if (urlMatch) {
            code = urlMatch[1];
        }

        // Remove any non-alphanumeric chars just in case (e.g. trailing slash)
        code = code.replace(/[^a-zA-Z0-9]/g, '');

        if (!code) {
            throw new Error('Could not parse a valid code from input.');
        }

        console.log(`[Stickerly] Fetching pack for code: ${code}`);

        // 2. Fetch Metadata - Try V3.1 First (most likely to work)
        let response = await fetch(`${API_V3}/${code}`, {
            headers: {
                'User-Agent': 'android-app/3.0.0',
                'Host': 'api.sticker.ly',
                'Connection': 'Keep-Alive',
                'Accept-Encoding': 'gzip'
            }
        });

        // Fallback to V1 if V3 fails
        if (!response.ok) {
            console.warn(`[Stickerly] V3 API failed (${response.status}), trying V1...`);
            response = await fetch(`${API_V1}/${code}`, {
                headers: {
                    'User-Agent': 'android-app/3.0.0'
                }
            });
        }

        if (!response.ok) {
            console.error(`[Stickerly] API fetch failed. Status: ${response.status}`);
            const text = await response.text();
            console.error(`[Stickerly] Response body: ${text}`);
            throw new Error(`Failed to fetch pack info: ${response.status}. Body: ${text.substring(0, 100)}`);
        }

        const data = await response.json();

        // 3. Parse Data
        // Scanner function to find the pack object in nested structures
        // It looks for an object that has 'packId' and 'stickers' or 'stickerCount'
        const findPackRoot = (obj: any): any => {
            if (!obj || typeof obj !== 'object') return null;
            if ((obj.packId || obj.id) && (obj.stickers || obj.stickerCount || obj.mainSticker)) return obj; // Likely the pack

            // Search values recursively
            for (const key of Object.keys(obj)) {
                const found = findPackRoot(obj[key]);
                if (found) return found;
            }
            return null;
        }

        // Limit recursion depth/breadth by checking common roots first
        let packRoot = data.result?.stickerPack || data.stickerPack || findPackRoot(data);

        if (!packRoot) {
            const dump = JSON.stringify(data).substring(0, 200);
            console.error('[Stickerly] Invalid data structure. Dump:', dump);
            throw new Error(`Invalid pack data: could not find pack details. Data keys: ${Object.keys(data).join(',')}`);
        }

        const packId = packRoot.packId || packRoot.id;
        const name = packRoot.name || 'Untitled Pack';
        const author = packRoot.artistName || packRoot.artist || 'Unknown';
        // Ensure stickers array exists
        const stickersData = packRoot.stickers || [];

        console.log(`[Stickerly] Parsed: ID=${packId}, Name=${name}, Count=${stickersData?.length}`);

        if (!stickersData.length) {
            console.warn('[Stickerly] No stickers array found. Trying to fetch generic count or error.');
            throw new Error('Pack contains no stickers.');
        }

        // 4. Download Logic
        const stickersDir = `${FileSystem.documentDirectory}stickers/${packId}/`;

        const dirInfo = await FileSystem.getInfoAsync(stickersDir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(stickersDir, { intermediates: true });
        }

        const savedStickers: { fileName: string; fullPath: string }[] = [];

        await Promise.all(stickersData.map(async (sticker: any, index: number) => {
            // API often returns different URL keys
            const imageUrl = sticker.resourceUrl || sticker.url || sticker.animatedUrl;
            if (!imageUrl) return;

            const ext = imageUrl.includes('.gif') ? 'gif' : 'webp';
            const fileName = `${index}_${Date.now()}.${ext}`;
            const localUri = `${stickersDir}${fileName}`;

            await FileSystem.downloadAsync(imageUrl, localUri);

            savedStickers.push({
                fileName,
                fullPath: localUri
            });
        }));

        // 5. Save to DB
        const pack: StickerPack = {
            id: packId.toString(),
            name,
            author,
            localPath: stickersDir,
            isFavorite: 0,
            createdAt: Date.now()
        };

        await saveStickerPack(pack, savedStickers);
        return { success: true, count: savedStickers.length, name };

    } catch (error) {
        console.error('[Stickerly] Error downloading pack:', error);
        return { success: false, error: error.message || error };
    }
};
