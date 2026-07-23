export interface EmojiCategory {
    id: string;
    name: string;
    icon: string;
    emojis: { char: string; keywords: string[] }[];
}

export const POPULAR_EMOJIS: EmojiCategory[] = [
    {
        id: 'popular',
        name: 'Popular',
        icon: '🔥',
        emojis: [
            { char: '❤️', keywords: ['heart', 'love', 'red'] },
            { char: '😂', keywords: ['joy', 'laugh', 'lol'] },
            { char: '😮', keywords: ['open_mouth', 'wow', 'surprised'] },
            { char: '😢', keywords: ['cry', 'sad', 'tear'] },
            { char: '😡', keywords: ['angry', 'rage', 'mad'] },
            { char: '👍', keywords: ['thumbsup', 'like', 'yes'] },
            { char: '🔥', keywords: ['fire', 'hot', 'lit'] },
            { char: '🎉', keywords: ['party', 'tada', 'celebrate'] },
            { char: '🙌', keywords: ['raised_hands', 'praise', 'hooray'] },
            { char: '✨', keywords: ['sparkles', 'magic', 'shine'] },
            { char: '😍', keywords: ['heart_eyes', 'love', 'crush'] },
            { char: '🙏', keywords: ['pray', 'thanks', 'please'] },
            { char: '💯', keywords: ['100', 'hundred', 'perfect'] },
            { char: '🤣', keywords: ['rofl', 'laughing', 'lol'] },
            { char: '💀', keywords: ['skull', 'dead', 'deadAF'] },
            { char: '💩', keywords: ['poop', 'shit', 'funny'] },
        ],
    },
];
