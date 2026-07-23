import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';

interface ChatImageProps {
    uri: string;
    onPress: (uri: string) => void;
    onLongPress?: () => void;
}

export default function ChatImage({ uri, onPress, onLongPress }: ChatImageProps) {
    const [aspectRatio, setAspectRatio] = useState(1); // Default square
    const [isLoading, setIsLoading] = useState(true);

    return (
        <TouchableOpacity
            onPress={() => onPress(uri)}
            onLongPress={onLongPress}
            activeOpacity={0.9}
            delayLongPress={500}
        >
            <Image
                source={{ uri }}
                style={{
                    width: 240,
                    height: undefined, // Let aspect ratio determine height
                    aspectRatio: aspectRatio,
                    borderRadius: 12,
                    backgroundColor: '#1a1a1a',
                }}
                contentFit="cover"
                transition={200}
                onLoad={(event) => {
                    const { width, height } = event.source;
                    if (width && height) {
                        setAspectRatio(width / height);
                    }
                    setIsLoading(false);
                }}
                pointerEvents="auto"
            />
        </TouchableOpacity>
    );
};
