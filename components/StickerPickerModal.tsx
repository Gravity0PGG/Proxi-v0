import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    Alert,
    ActivityIndicator,
    Image,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import CyberpunkTheme from '../constants/Colors';
import { downloadStickerPack } from '../services/stickerly.service';
import { getStickerPacks, getStickersForPack, deleteStickerPack, StickerPack, Sticker, initStickerDatabase } from '../services/stickerDatabase';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface StickerPickerProps {
    onClose: () => void;
    onStickerSelected: (uri: string) => void;
    inline?: boolean; // If true, render without blur/modal styles for embedding
}

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 4;
const ITEM_SIZE = width / COLUMN_COUNT - 16;

export function StickerPickerView({ onClose, onStickerSelected, inline }: StickerPickerProps) {
    const [activeTab, setActiveTab] = useState<'library' | 'import'>('library');
    const [packs, setPacks] = useState<StickerPack[]>([]);
    const [selectedPack, setSelectedPack] = useState<StickerPack | null>(null);
    const [stickers, setStickers] = useState<Sticker[]>([]);

    // Resize Logic
    const MIN_HEIGHT = 300;
    const MAX_HEIGHT = Dimensions.get('window').height * 0.8;
    const panelHeight = useSharedValue(MIN_HEIGHT);
    const context = useSharedValue({ startHeight: MIN_HEIGHT });

    const gesture = Gesture.Pan()
        .minDistance(1) // Activate essentially immediately
        .activeOffsetY([-5, 5]) // Capture vertical movement quickly
        .onStart(() => {
            context.value = { startHeight: panelHeight.value };
        })
        .onUpdate((event) => {
            // Dragging UP (negative translation) should INCREASE height
            // translationY is negative when dragging up.
            // New height = startHeight - translationY
            const newHeight = context.value.startHeight - event.translationY;
            panelHeight.value = Math.max(MIN_HEIGHT, Math.min(newHeight, MAX_HEIGHT));
        })
        .onEnd(() => {
            if (panelHeight.value > (MIN_HEIGHT + MAX_HEIGHT) / 2) {
                panelHeight.value = withSpring(MAX_HEIGHT, {
                    mass: 0.5,
                    damping: 50,
                    stiffness: 400,
                    overshootClamping: true
                });
            } else {
                panelHeight.value = withSpring(MIN_HEIGHT, {
                    mass: 0.5,
                    damping: 50,
                    stiffness: 400,
                    overshootClamping: true
                });
            }
        });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            height: panelHeight.value,
        };
    });

    // Import State
    const [importCode, setImportCode] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        initStickerDatabase().then(loadPacks);
    }, []);

    const loadPacks = async () => {
        const loadedPacks = await getStickerPacks();
        setPacks(loadedPacks);
    };

    const handlePackSelect = async (pack: StickerPack) => {
        setSelectedPack(pack);
        const packStickers = await getStickersForPack(pack.id);
        setStickers(packStickers);
    };

    const handleBackToPacks = () => {
        setSelectedPack(null);
        setStickers([]);
    };

    const handleImport = async () => {
        if (!importCode.trim()) return;

        setIsImporting(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const result = await downloadStickerPack(importCode);

        setIsImporting(false);
        setImportCode('');

        if (result.success) {
            Alert.alert('Success', `Imported pack: ${result.name}`);
            loadPacks();
            setActiveTab('library');
        } else {
            Alert.alert('Error', 'Failed to import pack. Check the code and try again.');
        }
    };

    const handleDeletePack = (pack: StickerPack) => {
        Alert.alert(
            'Delete Pack',
            `Are you sure you want to delete "${pack.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteStickerPack(pack.id);
                        loadPacks();
                        if (selectedPack?.id === pack.id) handleBackToPacks();
                    }
                }
            ]
        );
    };

    const renderTitleBar = () => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>
                {activeTab === 'import' ? 'Import Pack' : 'Stickers'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabs}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'library' && styles.activeTab]}
                onPress={() => setActiveTab('library')}
            >
                <Text style={[styles.tabText, activeTab === 'library' && styles.activeTabText]}>Library</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'import' && styles.activeTab]}
                onPress={() => setActiveTab('import')}
            >
                <Text style={[styles.tabText, activeTab === 'import' && styles.activeTabText]}>Import</Text>
            </TouchableOpacity>
        </View>
    );

    const renderContent = () => (
        <View style={styles.content}>
            {activeTab === 'library' ? (
                selectedPack ? (
                    <View style={{ flex: 1 }}>
                        <View style={styles.subHeader}>
                            <TouchableOpacity onPress={handleBackToPacks} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="arrow-back" size={20} color={CyberpunkTheme.primary} />
                                <Text style={{ color: CyberpunkTheme.primary, marginLeft: 5 }}>Back</Text>
                            </TouchableOpacity>
                            <Text style={styles.packTitle}>{selectedPack.name}</Text>
                        </View>
                        <FlatList
                            data={stickers}
                            keyExtractor={item => item.id.toString()}
                            numColumns={COLUMN_COUNT}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => onStickerSelected(item.fullPath)}
                                    style={styles.stickerItem}
                                >
                                    <Image
                                        source={{ uri: item.fullPath }}
                                        style={styles.stickerImage}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={styles.gridContent}
                        />
                    </View>
                ) : (
                    <FlatList
                        data={packs}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.packItem}
                                onPress={() => handlePackSelect(item)}
                                onLongPress={() => handleDeletePack(item)}
                            >
                                <View style={styles.packIcon}>
                                    <Ionicons name="folder-open" size={24} color={CyberpunkTheme.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.packName}>{item.name}</Text>
                                    <Text style={styles.packAuthor}>{item.author}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#666" />
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No stickers yet.</Text>
                                <Text style={styles.emptySubText}>Import a pack to get started!</Text>
                            </View>
                        }
                    />
                )
            ) : (
                <View style={styles.importContainer}>
                    <Text style={styles.importLabel}>Enter Code or Link:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. sticker.ly/s/ABCDEF"
                        placeholderTextColor="#666"
                        value={importCode}
                        onChangeText={setImportCode}
                        onFocus={() => {
                            panelHeight.value = withSpring(MAX_HEIGHT, {
                                mass: 0.5,
                                damping: 50,
                                stiffness: 400,
                                overshootClamping: true
                            });
                        }}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity
                        style={[styles.importButton, isImporting && { opacity: 0.5 }]}
                        onPress={handleImport}
                        disabled={isImporting}
                    >
                        {isImporting ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.importButtonText}>Import Pack</Text>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.hint}>
                        Tips:
                        {'\n'}• Paste the share link from Sticker.ly
                        {'\n'}• This downloads the pack locally to your device.
                    </Text>
                </View>
            )}
        </View>
    );



    if (inline) {
        return (
            <Animated.View style={[styles.inlineContainer, animatedStyle]}>
                <GestureDetector gesture={gesture}>
                    {/* Wrapped: Handle + Title Bar are now one touch target */}
                    <Animated.View style={{ backgroundColor: 'transparent' }}>
                        <View style={styles.dragHandleContainer}>
                            <View style={styles.dragHandle} />
                        </View>
                        {renderTitleBar()}
                    </Animated.View>
                </GestureDetector>
                {renderTabs()}
                {renderContent()}
            </Animated.View>
        );
    }

    return (
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
            {renderTitleBar()}
            {renderTabs()}
            {renderContent()}
        </BlurView>
    );
}

interface StickerPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onStickerSelected: (uri: string) => void;
}

export default function StickerPickerModal({ visible, onClose, onStickerSelected }: StickerPickerModalProps) {
    if (!visible) return null;
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <StickerPickerView onClose={onClose} onStickerSelected={onStickerSelected} />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    // Inline Styles
    inlineContainer: {
        backgroundColor: '#111',
        width: '100%',
    },
    blurContainer: {
        height: '70%',
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8, // Reduced top padding since handle is there
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dragHandleContainer: {
        width: '100%',
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: CyberpunkTheme.primary,
    },
    tabText: {
        color: '#888',
        fontSize: 16,
    },
    activeTabText: {
        color: CyberpunkTheme.primary,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    // Packs List
    packItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        marginBottom: 8,
    },
    packIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    packName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    packAuthor: {
        color: '#888',
        fontSize: 12,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubText: {
        color: '#888',
        fontSize: 14,
    },
    // Grid
    subHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    packTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    gridContent: {
        paddingBottom: 20,
    },
    stickerItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        margin: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stickerImage: {
        width: '90%',
        height: '90%',
    },
    // Import
    importContainer: {
        padding: 10,
    },
    importLabel: {
        color: '#FFF',
        marginBottom: 8,
        fontSize: 16,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: '#FFF',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        marginBottom: 16,
    },
    importButton: {
        backgroundColor: CyberpunkTheme.primary,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    importButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
    hint: {
        color: '#666',
        marginTop: 20,
        fontSize: 12,
        lineHeight: 18,
    }
});
