import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('stickers.db');

export interface StickerPack {
    id: string; // The Sticker.ly code or unique ID
    name: string;
    author: string;
    localPath: string; // Folder path relative to DocumentDirectory or full path
    isFavorite: number; // 0 or 1
    createdAt: number;
}

export interface Sticker {
    id: number;
    packId: string;
    fileName: string; // e.g. "1.webp"
    fullPath: string; // Full URI file://...
}

export const initStickerDatabase = async () => {
    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Create Packs Table
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS packs (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            author TEXT,
            local_path TEXT NOT NULL,
            is_favorite INTEGER DEFAULT 0,
            created_at INTEGER
        );
    `);

    // Create Stickers Table
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS stickers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pack_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            full_path TEXT NOT NULL,
            FOREIGN KEY (pack_id) REFERENCES packs (id) ON DELETE CASCADE
        );
    `);

    console.log('Sticker Database Initialized');
};

export const saveStickerPack = async (pack: StickerPack, stickers: { fileName: string; fullPath: string }[]) => {
    try {
        // Transaction to save pack and stickers
        await db.withTransactionAsync(async () => {
            await db.runAsync(
                `INSERT OR REPLACE INTO packs (id, name, author, local_path, is_favorite, created_at) VALUES (?, ?, ?, ?, ?, ?);`,
                [pack.id, pack.name, pack.author, pack.localPath, pack.isFavorite, Date.now()]
            );

            for (const sticker of stickers) {
                await db.runAsync(
                    `INSERT INTO stickers (pack_id, file_name, full_path) VALUES (?, ?, ?);`,
                    [pack.id, sticker.fileName, sticker.fullPath]
                );
            }
        });
        console.log(`Pack ${pack.name} saved with ${stickers.length} stickers.`);
    } catch (error) {
        console.error('Error saving sticker pack:', error);
        throw error;
    }
};

export const getStickerPacks = async (): Promise<StickerPack[]> => {
    try {
        const result = await db.getAllAsync<StickerPack>('SELECT * FROM packs ORDER BY created_at DESC;');
        // Map snake_case db columns to camelCase interface if needed, but here simple mapping
        // Logic: expo-sqlite returns objects with column names.
        // We'll trust the query returns matching names or map them.
        // Wait, SQL columns are snake_case. Interface is camelCase.
        // Let's fix the SQL or the return type.
        // Better to select and alias.
        return await db.getAllAsync(`
            SELECT 
                id, 
                name, 
                author, 
                local_path as localPath, 
                is_favorite as isFavorite, 
                created_at as createdAt 
            FROM packs ORDER BY created_at DESC;
        `);
    } catch (error) {
        console.error('Error fetching sticker packs:', error);
        return [];
    }
};

export const getStickersForPack = async (packId: string): Promise<Sticker[]> => {
    try {
        return await db.getAllAsync(`
            SELECT 
                id, 
                pack_id as packId, 
                file_name as fileName, 
                full_path as fullPath 
            FROM stickers WHERE pack_id = ?;
        `, [packId]);
    } catch (error) {
        console.error('Error fetching stickers:', error);
        return [];
    }
};

export const deleteStickerPack = async (packId: string) => {
    try {
        await db.runAsync('DELETE FROM packs WHERE id = ?;', [packId]);
        // Stickers auto-deleted by CASCADE
        console.log(`Deleted pack ${packId}`);
    } catch (error) {
        console.error('Error deleting sticker pack:', error);
        throw error;
    }
};
