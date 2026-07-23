import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import CyberpunkTheme from '../../constants/Colors';

export default function TabLayout() {
    const router = useRouter();
    const pathname = usePathname();

    // Detect if we're in camera mode
    const isCameraMode = pathname === '/create' || pathname.includes('/create');

    // State-Aware Universal Create Button Component
    const CreateButton = () => {
        const handlePress = () => {
            if (isCameraMode) {
                // Close icon pressed - go back
                router.back();
            } else {
                // Plus icon pressed - open camera
                router.push('/create' as any);
            }
        };

        return (
            <TouchableOpacity
                onPress={handlePress}
                style={styles.createButton}
                activeOpacity={0.7}
            >
                <BlurView
                    intensity={40}
                    tint="dark"
                    style={styles.createButtonBlur}
                >
                    <Ionicons
                        name={isCameraMode ? "close" : "add"}
                        size={22}
                        color={CyberpunkTheme.primary}
                    />
                </BlurView>
            </TouchableOpacity>
        );
    };

    return (
        <Tabs
            screenOptions={{
                // Tab Bar Styling
                tabBarActiveTintColor: CyberpunkTheme.primary, // Neon Orange
                tabBarInactiveTintColor: CyberpunkTheme.inactive,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: '#000000',
                    borderTopWidth: 1,
                    borderTopColor: CyberpunkTheme.border,
                    height: 90,
                    paddingBottom: 20,
                    paddingTop: 10,
                    position: 'absolute',
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                },
                tabBarBackground: () => (
                    <BlurView
                        intensity={80}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                    />
                ),

                // Header Styling
                headerShown: true,
                headerStyle: {
                    backgroundColor: '#000000',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                    color: '#ffffff',
                    fontWeight: 'bold',
                },
                headerLeft: () => <CreateButton />,

                lazy: false,
            }}
        >
            {/* Tab 1: Map (Index) */}
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Map',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="map-outline" size={30} color={color} />
                    ),
                }}
            />

            {/* Tab 2: Reels (Feed) */}
            <Tabs.Screen
                name="feed"
                options={{
                    title: 'Reels',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="play-circle-outline" size={30} color={color} />
                    ),
                }}
            />

            {/* Tab 3: Search */}
            <Tabs.Screen
                name="search"
                options={{
                    title: 'Search',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="search-outline" size={30} color={color} />
                    ),
                }}
            />

            {/* Tab 4: Chat */}
            <Tabs.Screen
                name="messages"
                options={{
                    title: 'Chat',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="chatbubble-outline" size={30} color={color} />
                    ),
                }}
            />

            {/* Tab 5: Profile */}
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    headerShown: false, // Profile has its own header with @username
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="person-outline" size={30} color={color} />
                    ),
                }}
            />

            {/* Hide these screens from the tab bar */}
            <Tabs.Screen
                name="map"
                options={{
                    href: null, // Hidden from tabs
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    href: null, // Hidden from tabs, accessed via create button
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    createButton: {
        marginLeft: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: CyberpunkTheme.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 8,
    },
    createButtonBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: CyberpunkTheme.border,
        borderRadius: 18,
    },
});
