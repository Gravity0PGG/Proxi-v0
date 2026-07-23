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


