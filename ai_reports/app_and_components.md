# AI Review Report: App and Components

This report contains the full source code for all screens and components in the project.

## File: app/_layout.tsx
```tsx
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { getAuthState, loadAuthFromStorage } from '../store/auth.store';

export default function RootLayout() {
    const [isAuth, setIsAuth] = useState(getAuthState());
    const [isLoading, setIsLoading] = useState(true);
    const segments = useSegments();
    const router = useRouter();

    // Load auth from storage on app startup
    useEffect(() => {
        const initAuth = async () => {
            try {
                const hasToken = await loadAuthFromStorage();
                setIsAuth(hasToken);
            } catch (error) {
                console.error('Error loading auth:', error);
                setIsAuth(false);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    // Handle navigation based on auth state
    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === 'auth';

        if (!isAuth && !inAuthGroup) {
            // Redirect to login if not authenticated
            router.replace('/auth/login');
        } else if (isAuth && inAuthGroup) {
            // Redirect to feed if authenticated and on auth screen
            router.replace('/(tabs)/feed');
        }
    }, [isAuth, segments, isLoading]);

    // Function to refresh auth state (can be called from auth screens)
    global.refreshAuth = () => {
        setIsAuth(getAuthState());
    };

    // Show loading screen while checking auth
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
        </Stack>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});
```

---

## File: app/(tabs)/_layout.tsx
```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <Tabs
            initialRouteName="feed"
            screenOptions={{
                tabBarActiveTintColor: '#000',
                tabBarInactiveTintColor: '#8E8E93',
                tabBarShowLabel: false,
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 0.5,
                    borderTopColor: '#E5E5EA',
                    height: 50,
                    paddingBottom: 0,
                },
                // Critical: Prevent screens from unmounting when switching tabs
                lazy: false,
                unmountOnBlur: false,
            }}
        >
            {/* Tab 1: Map */}
            <Tabs.Screen
                name="map"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="map-outline" size={24} color={color} />
                    ),
                }}
            />

            {/* Tab 2: Feed (Default/Initial) */}
            <Tabs.Screen
                name="feed"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="play-circle-outline" size={28} color={color} />
                    ),
                }}
            />

            {/* Tab 3: Search */}
            <Tabs.Screen
                name="search"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="search-outline" size={24} color={color} />
                    ),
                }}
            />

            {/* Tab 4: Messages */}
            <Tabs.Screen
                name="messages"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="chatbubble-outline" size={24} color={color} />
                    ),
                }}
            />

            {/* Tab 5: Profile */}
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
```

---

## File: app/(tabs)/feed.tsx
```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ReelsFeed from '../../components/ReelsFeed';

export default function FeedScreen() {
    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <ReelsFeed />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
});
```

---

## File: app/(tabs)/map.tsx
```tsx
import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Region } from 'react-native-maps';
const { PROVIDER_APPLE } = require('react-native-maps');
import { useRouter } from 'expo-router';

// Initial "globe-level" camera position
const INITIAL_REGION: Region = {
    latitude: 20.0,
    longitude: 0.0,
    latitudeDelta: 80.0,
    longitudeDelta: 80.0,
};

import { onMapTap, onMapPan } from '../../services/map.service';
import { setLastViewedRegion } from '../../store/map.store';

export default function MapScreen() {
    const mapRef = useRef<MapView>(null);
    const router = useRouter();
    const [selectedLocation, setSelectedLocation] = useState<{
        latitude: number;
        longitude: number;
        zoomLevel: number;
        radius: number;
    } | null>(null);

    const lastMoveTime = useRef<number>(0);

    // Handle region change to track if user is actively scrolling
    const handleRegionChangeComplete = (region: Region) => {
        lastMoveTime.current = Date.now();
        setLastViewedRegion(region);
        onMapPan(); // Logic hook
    };

    // Handle tap on map - captures location for feed navigation
    const handleMapPress = (event: any) => {
        const { coordinate } = event.nativeEvent;

        // Prevent accidental taps during scroll
        const timeSinceLastMove = Date.now() - lastMoveTime.current;
        if (timeSinceLastMove < 200) {
            return; // Ignore tap if map was recently moving
        }

        // 1. Get current deltas for zoom calculation
        // Fallback to defaults if ref is not available
        const currentLatDelta = 0.1;

        // 2. Process Map Bridge Logic
        const payload = onMapTap(coordinate.latitude, coordinate.longitude, currentLatDelta);

        // 3. Update local debug state
        setSelectedLocation({
            latitude: payload.lat,
            longitude: payload.lng,
            zoomLevel: payload.zoomLevel,
            radius: payload.radius,
        });

        console.log('Map Bridge Triggered - payload:', payload);

        // 4. Navigate to Feed
        router.push('/(tabs)/feed');
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_APPLE}
                style={styles.map}
                initialRegion={INITIAL_REGION}
                scrollEnabled={true}
                zoomEnabled={true}
                rotateEnabled={false}
                pitchEnabled={false}
                showsCompass={false}
                showsScale={false}
                showsBuildings={false}
                toolbarEnabled={false}
                showsUserLocation={false}
                onPress={handleMapPress}
                onRegionChangeComplete={handleRegionChangeComplete}
            />

            {/* Debug info */}
            {selectedLocation && (
                <View style={styles.debugInfo}>
                    <Text style={styles.debugText}>
                        Context: {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                    </Text>
                    <Text style={styles.debugText}>
                        Radius: {(selectedLocation.radius / 1000).toFixed(1)}km | Zoom: {selectedLocation.zoomLevel}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    debugInfo: {
        position: 'absolute',
        bottom: 80,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 12,
        borderRadius: 8,
    },
    debugText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'monospace',
    },
});
```

---

## File: app/(tabs)/messages.tsx
```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MessagesScreen() {
    const [mountTime] = useState(() => new Date().toLocaleTimeString());

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Messages</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.label}>DMs</Text>
                <Text style={styles.statusText}>Screen persisted</Text>
                <Text style={styles.info}>
                    This screen maintains its state.
                    {'\n\n'}
                    Mounted at: {mountTime}
                    {'\n\n'}
                    Messaging functionality will be added later.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5EA',
    },
    headerText: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    label: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    statusText: {
        fontSize: 14,
        color: '#34C759',
        marginBottom: 20,
    },
    info: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: 20,
    },
});
```

---

## File: app/(tabs)/profile.tsx
```tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Image,
    Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '../../store/auth.store';
import { Post } from '../../types/post.types';
import { getUserPosts } from '../../services/feed.service';
import { getPostStore, setProfilePosts, subscribe } from '../../store/post.store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH / 3;

export default function ProfileScreen() {
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [store, setStore] = useState(getPostStore());

    // Mock user data for high-fidelity demo
    const MOCK_USER = {
        id: 'user_001',
        username: 'alex_explorer',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
        bio: '📍 Exploring the world through a lens\n📸 Digital Creator\n🌍 Nature & Tech',
        stats: {
            posts: 124,
            followers: '12.4k',
            following: '842'
        }
    };

    useEffect(() => {
        const unsub = subscribe(() => {
            const currentStore = getPostStore();
            setStore(currentStore);
            setPosts(currentStore.profilePosts);
        });

        // Initial load
        const userPosts = getUserPosts(MOCK_USER.id);
        setProfilePosts(userPosts);

        return unsub;
    }, []);

    const handleLogout = async () => {
        await logout();
        router.replace('/auth/login');
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <Text style={styles.usernameTitle}>{MOCK_USER.username}</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
                <Image source={{ uri: MOCK_USER.avatar }} style={styles.avatar} />
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{MOCK_USER.stats.posts}</Text>
                        <Text style={styles.statLabel}>Posts</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{MOCK_USER.stats.followers}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{MOCK_USER.stats.following}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </View>
                </View>
            </View>

            {/* Bio & Actions */}
            <View style={styles.bioContainer}>
                <Text style={styles.realName}>Alex Explorer</Text>
                <Text style={styles.bioText}>{MOCK_USER.bio}</Text>

                <TouchableOpacity style={styles.editButton}>
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
            </View>

            {/* Grid Tabs Placeholder */}
            <View style={styles.tabsContainer}>
                <View style={[styles.tab, styles.activeTab]}>
                    <Ionicons name="grid-outline" size={22} color="#000" />
                </View>
            </View>
        </View>
    );

    const renderPost = ({ item }: { item: Post }) => (
        <TouchableOpacity style={styles.gridItem}>
            <Image
                source={{ uri: item.mediaUrl }}
                style={styles.gridImage}
                resizeMode="cover"
            />
            {item.mediaType === 'video' && (
                <View style={styles.videoIcon}>
                    <Ionicons name="play" size={12} color="#fff" />
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={(item) => item.postId}
                numColumns={3}
                ListHeaderComponent={renderHeader}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.flatListContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    flatListContent: {
        paddingBottom: 20,
    },
    headerContainer: {
        paddingTop: 45, // Safe area for notch
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 50,
    },
    usernameTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 10,
    },
    avatar: {
        width: 86,
        height: 86,
        borderRadius: 43,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    statsContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginLeft: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 13,
        color: '#666',
    },
    bioContainer: {
        paddingHorizontal: 16,
        marginTop: 12,
    },
    realName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    bioText: {
        fontSize: 14,
        lineHeight: 18,
        color: '#262626',
        marginTop: 2,
    },
    editButton: {
        marginTop: 20,
        backgroundColor: '#efefef',
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    editButtonText: {
        fontWeight: '600',
        fontSize: 14,
    },
    tabsContainer: {
        flexDirection: 'row',
        marginTop: 25,
        borderTopWidth: 0.5,
        borderTopColor: '#dbdbdb',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
    },
    activeTab: {
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    gridItem: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH,
        padding: 1,
    },
    gridImage: {
        width: '100%',
        height: '100%',
    },
    videoIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: 4,
        borderRadius: 4,
    }
});
```

---

## File: app/(tabs)/search.tsx
```tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchUsers, getMockLocations } from '../../services/post.service';
import { setMapSelectedLocation, setSearchResultsUsers, getPostStore, subscribe } from '../../store/post.store';

type SearchTab = 'users' | 'locations';

export default function SearchScreen() {
    const router = useRouter();
    const [searchText, setSearchText] = useState('');
    const [activeTab, setActiveTab] = useState<SearchTab>('users');
    const [userResults, setUserResults] = useState<any[]>([]);
    const [locationResults, setLocationResults] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        const unsub = subscribe(() => {
            const store = getPostStore();
            setUserResults(store.searchResultsUsers);
        });
        return unsub;
    }, []);

    const handleSearch = (text: string) => {
        setSearchText(text);
        if (text.trim().length > 0) {
            setHasSearched(true);
            if (activeTab === 'users') {
                const users = searchUsers(text);
                setSearchResultsUsers(users);
            } else {
                const locations = getMockLocations(text);
                setLocationResults(locations);
            }
        } else {
            setHasSearched(false);
            setSearchResultsUsers([]);
            setLocationResults([]);
        }
    };

    const handleSelectLocation = (loc: any) => {
        setMapSelectedLocation({
            latitude: loc.lat,
            longitude: loc.lon
        });
        router.push('/(tabs)/feed');
    };

    const renderUser = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.userItem}>
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            <View style={styles.userInfo}>
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.bioSnippet} numberOfLines={1}>{item.bio}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </TouchableOpacity>
    );

    const renderLocation = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.locationItem}
            onPress={() => handleSelectLocation(item)}
        >
            <View style={styles.locationIcon}>
                <Ionicons name="location-sharp" size={24} color="#007AFF" />
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.locationName}>{item.name}</Text>
                <Text style={styles.locationCoords}>
                    {item.lat.toFixed(4)}, {item.lon.toFixed(4)}
                </Text>
            </View>
            <Ionicons name="arrow-forward-circle-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Explore</Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchWrapper}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={activeTab === 'users' ? "Search users..." : "Search locations..."}
                        value={searchText}
                        onChangeText={handleSearch}
                        autoCapitalize="none"
                    />
                </View>
            </View>

            {/* Tab Toggle */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'users' && styles.activeTab]}
                    onPress={() => setActiveTab('users')}
                >
                    <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'locations' && styles.activeTab]}
                    onPress={() => setActiveTab('locations')}
                >
                    <Text style={[styles.tabText, activeTab === 'locations' && styles.activeTabText]}>Locations</Text>
                </TouchableOpacity>
            </View>

            {/* Results */}
            <FlatList
                data={activeTab === 'users' ? userResults : locationResults}
                renderItem={activeTab === 'users' ? renderUser : renderLocation}
                keyExtractor={(item, index) => item.postId || item.id || index.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    !!hasSearched ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search-outline" size={60} color="#E5E5EA" />
                            <Text style={styles.emptyText}>No {activeTab} found</Text>
                        </View>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Text style={styles.placeholderText}>
                                {activeTab === 'users' ? "Search for creators by name" : "Search for trending locations"}
                            </Text>
                        </View>
                    )
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    searchWrapper: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#efefef',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginVertical: 10,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        marginRight: 10,
        borderRadius: 20,
        backgroundColor: '#f6f6f6',
    },
    activeTab: {
        backgroundColor: '#000',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    activeTabText: {
        color: '#fff',
    },
    list: {
        paddingVertical: 10,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f0f0f0',
    },
    userInfo: {
        flex: 1,
        marginLeft: 15,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
    },
    bioSnippet: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 2,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    locationIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E5F1FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationName: {
        fontSize: 16,
        fontWeight: '600',
    },
    locationCoords: {
        fontSize: 12,
        color: '#007AFF',
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#8E8E93',
        marginTop: 10,
    },
    placeholderContainer: {
        alignItems: 'center',
        marginTop: 80,
    },
    placeholderText: {
        fontSize: 16,
        color: '#C7C7CC',
        textAlign: 'center',
        paddingHorizontal: 40,
    }
});
```

---

## File: app/auth/login.tsx
```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '../../store/auth.store';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleLogin = async () => {
        try {
            // Simulate API response with mock JWT token
            const fakeToken = `mock-jwt-token-${Date.now()}-${email}`;

            // Save token securely
            await login(fakeToken);

            // Refresh auth state in root layout
            if (global.refreshAuth) {
                global.refreshAuth();
            }

            // Navigate to feed
            router.replace('/(tabs)/feed');
        } catch (error) {
            console.error('Login error:', error);
            // In a real app, show error message to user
        }
    };

    const goToSignup = () => {
        router.push('/auth/signup');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={goToSignup}>
                <Text style={styles.linkText}>Don't have an account? Sign up</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 40,
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        fontSize: 16,
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#007AFF',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    linkText: {
        marginTop: 20,
        color: '#007AFF',
        fontSize: 16,
    },
});
```

---

## File: app/auth/signup.tsx
```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '../../store/auth.store';

export default function SignupScreen() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleSignup = async () => {
        try {
            // Simulate API response with mock JWT token
            const fakeToken = `mock-jwt-token-${Date.now()}-${username}-${email}`;

            // Save token securely
            await login(fakeToken);

            // Refresh auth state in root layout
            if (global.refreshAuth) {
                global.refreshAuth();
            }

            // Navigate to feed
            router.replace('/(tabs)/feed');
        } catch (error) {
            console.error('Signup error:', error);
            // In a real app, show error message to user
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Account</Text>

            <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />

            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleSignup}>
                <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.linkText}>Already have an account? Login</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 40,
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        fontSize: 16,
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#007AFF',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    linkText: {
        marginTop: 20,
        color: '#007AFF',
        fontSize: 16,
    },
});
```

---

## File: components/BottomSheet.tsx
```tsx
import React from 'react';
import { View } from 'react-native';

export default function BottomSheet() {
    return <View />;
}
```

---

## File: components/MapViewContainer.tsx
```tsx
import React from 'react';
import { View } from 'react-native';

export default function MapViewContainer() {
    return <View />;
}
```

---

## File: components/ReelItem.tsx
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Dimensions,
    TouchableOpacity
} from 'react-native';
import { Post } from '../types/post.types';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { reportWatchTime, reportReplay } from '../services/reelsSession.service';

interface ReelItemProps {
    post: Post;
    isActive: boolean;
}

export default function ReelItem({ post, isActive }: ReelItemProps) {
    const videoLengthSec = 15; // Mock video length
    const watchTimer = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        if (isActive) {
            console.log(`[ReelItem] Active: ${post.postId}`);

            // Simulate watch-time pulse every 1 second
            watchTimer.current = setInterval(() => {
                reportWatchTime(post.postId, 1000, videoLengthSec);
            }, 1000);
        } else {
            if (watchTimer.current) {
                clearInterval(watchTimer.current);
            }
        }

        return () => {
            if (watchTimer.current) {
                clearInterval(watchTimer.current);
            }
        };
    }, [isActive, post.postId]);

    // Simulate replay detection (if it reaches "end")
    // In a real app, this would be onVideoEnd callback
    const handleReplay = () => {
        reportReplay(post.postId);
    };
    return (
        <View style={styles.container}>
            {/* Media Background */}
            <Image
                source={{ uri: post.mediaUrl }}
                style={styles.media}
                resizeMode="cover"
            />

            {/* Overlay Layers */}
            <View style={styles.overlay}>
                {/* Bottom Content (Caption, User) */}
                <View style={styles.bottomContent}>
                    <Text style={styles.username}>@{post.creatorId}</Text>
                    {post.caption && (
                        <Text style={styles.caption} numberOfLines={2}>
                            {post.caption}
                        </Text>
                    )}
                    <View style={styles.locationContainer}>
                        <Ionicons name="location" size={12} color="#fff" />
                        <Text style={styles.locationText}>
                            {post.location.city || post.location.geohash.substring(0, 7)}
                        </Text>
                    </View>
                </View>

                {/* Right Actions (Likes, Comments, Shares, Saves) */}
                <View style={styles.rightActions}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="heart" size={32} color="#fff" />
                        <Text style={styles.actionText}>{post.likesCount}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="chatbubble" size={30} color="#fff" />
                        <Text style={styles.actionText}>{post.commentsCount}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="bookmark" size={30} color="#fff" />
                        <Text style={styles.actionText}>{post.savesCount}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="share-social" size={30} color="#fff" />
                        <Text style={styles.actionText}>{post.sharesCount}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    media: {
        ...StyleSheet.absoluteFillObject,
        width: SCREEN_WIDTH,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)', // Subtle gradient would be better
        justifyContent: 'flex-end',
        padding: 16,
        paddingBottom: 40,
    },
    bottomContent: {
        width: '80%',
    },
    username: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    caption: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    locationText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    categoryBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    categoryText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
    },
    rightActions: {
        position: 'absolute',
        right: 12,
        bottom: 80,
        alignItems: 'center',
    },
    actionButton: {
        alignItems: 'center',
        marginBottom: 20,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    socialBadge: {
        backgroundColor: '#FF3B30',
        padding: 4,
        borderRadius: 12,
        marginTop: -10,
    }
});
```

---

## File: components/ReelsFeed.tsx
```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { Post } from '../types/post.types';
import { getIntelligentFeed } from '../services/feed.service';
import {
    getPostStore,
    setFeedPosts,
    setActiveTier,
    setOffset,
    setHasMore,
    setLoading,
    clearAllPosts,
    subscribe
} from '../store/post.store';
import ReelItem from './ReelItem';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Tab bar height estimate (adjust if needed)
const TAB_BAR_HEIGHT = 50;
const REEL_HEIGHT = SCREEN_HEIGHT - TAB_BAR_HEIGHT;

import { getFeedStore, subscribe as subscribeFeed } from '../store/feed.store';
import { getFeedContextStore, subscribe as subscribeContext } from '../store/feedContext.store';
import { getContentStore } from '../store/content.store';
import { requestFeedByLocation } from '../services/feedDiscovery.service';

import { setCurrentVideo } from '../store/reelsSession.store';

export default function ReelsFeed() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

    // Viewability Config for tracking active reel
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50
    }).current;

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            const activeItem = viewableItems[0].item as Post;
            setCurrentVideoId(activeItem.postId);
            // Report active video to session store
            setCurrentVideo(activeItem.postId);
        }
    }).current;

    // 1. Listen to Localized Feed Context (Map interactions)
    useEffect(() => {
        const unsubContext = subscribeContext(() => {
            const context = getFeedContextStore();
            if (context.source === 'map' && context.activeLocation) {
                console.log('ReelsFeed: Location context detected from map. Requesting feed...');
                requestFeedByLocation({
                    lat: context.activeLocation.latitude,
                    lng: context.activeLocation.longitude,
                    radius: context.activeRadius,
                    timeWindow: context.activeTimeWindow
                });
            }
        });

        // 2. Listen to Ranked Feed State
        const unsubFeed = subscribeFeed(() => {
            const feedState = getFeedStore();
            const contentPosts = getContentStore().posts;

            // Map IDs to full Post objects
            const rankedPosts = feedState.rankedPostIds
                .map(id => contentPosts[id])
                .filter(Boolean);

            setPosts(rankedPosts);
            setIsLoading(feedState.isLoading);
        });

        // Initial Load or Check Context
        const initialContext = getFeedContextStore();
        if (initialContext.source === 'map' && initialContext.activeLocation) {
            requestFeedByLocation({
                lat: initialContext.activeLocation.latitude,
                lng: initialContext.activeLocation.longitude,
                radius: initialContext.activeRadius
            });
        }

        return () => {
            unsubContext();
            unsubFeed();
        };
    }, []);

    const handleRefresh = async () => {
        const context = getFeedContextStore();
        if (context.activeLocation) {
            await requestFeedByLocation({
                lat: context.activeLocation.latitude,
                lng: context.activeLocation.longitude,
                radius: context.activeRadius
            });
        }
    };

    const renderItem = ({ item }: { item: Post }) => (
        <View style={{ height: REEL_HEIGHT }}>
            <ReelItem post={item} isActive={item.postId === currentVideoId} />
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={posts}
                renderItem={renderItem}
                keyExtractor={(item) => item.postId}
                pagingEnabled={true}
                showsVerticalScrollIndicator={false}
                snapToInterval={REEL_HEIGHT}
                snapToAlignment="start"
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                refreshControl={
                    <RefreshControl
                        refreshing={!!(isLoading && posts.length === 0)}
                        onRefresh={handleRefresh}
                        tintColor="#fff"
                    />
                }
                ListFooterComponent={
                    isLoading && posts.length > 0 ? (
                        <View style={styles.footerLoader}>
                            <ActivityIndicator size="large" color="#fff" />
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    footerLoader: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
```

---

## File: components/UserAvatar.tsx
```tsx
import React from 'react';
import { View } from 'react-native';

export default function UserAvatar() {
    return <View />;
}
```

---

## File: components/VideoReel.tsx
```tsx
import React from 'react';
import { View } from 'react-native';

export default function VideoReel() {
    return <View />;
}
```
