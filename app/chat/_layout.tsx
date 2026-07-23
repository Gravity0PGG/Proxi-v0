import { Stack } from 'expo-router';
import CyberpunkTheme from '../../constants/Colors';

export default function ChatLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: {
                    backgroundColor: CyberpunkTheme.background, // Black background
                },
            }}
        />
    );
}
