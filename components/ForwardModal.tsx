import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import CyberpunkTheme from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Contact {
    id: string;
    name: string;
    avatar: string; // URL
    type: 'user' | 'group';
}

// Empty contacts array - will be populated from real data
const contacts: Contact[] = [];

interface ForwardModalProps {
    visible: boolean;
    onClose: () => void;
    onForward: (targetIds: string[], optionalMessage: string) => void;
}

export default function ForwardModal({ visible, onClose, onForward }: ForwardModalProps) {
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [messageText, setMessageText] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const filteredContacts = useMemo(() => {
        if (!searchQuery) return contacts;
        return contacts.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    const handleSelect = (id: string) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(pid => pid !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSend = () => {
        onForward(selectedIds, messageText);
        // Reset state
        setSelectedIds([]);
        setMessageText('');
        setSearchQuery('');
    };

    const renderItem = ({ item }: { item: Contact }) => {
        const isSelected = selectedIds.includes(item.id);
        return (
            <TouchableOpacity
                style={styles.gridItem}
                onPress={() => handleSelect(item.id)}
                activeOpacity={0.7}
            >
                <View style={[styles.avatarContainer, isSelected && styles.avatarSelected]}>
                    <Image
                        source={{ uri: item.avatar }}
                        style={styles.avatar}
                        contentFit="cover"
                    />
                    {item.type === 'group' && (
                        <View style={styles.groupIndicator}>
                            <Ionicons name="people" size={14} color="#000" />
                        </View>
                    )}
                    {isSelected && (
                        <View style={styles.checkBadge}>
                            <Ionicons name="checkmark" size={12} color="#FFF" />
                        </View>
                    )}
                </View>
                <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    if (!visible) return null;

    const canSend = selectedIds.length > 0;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Backdrop Blur */}
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={[styles.panel, { marginTop: insets.top + 20 }]}>

                        {/* Header Row: Search + Close */}
                        <View style={styles.headerRow}>
                            <View style={[
                                styles.searchContainer,
                                isFocused && styles.searchContainerFocused
                            ]}>
                                <Ionicons
                                    name="search"
                                    size={18}
                                    color={isFocused ? CyberpunkTheme.primary : CyberpunkTheme.textSecondary}
                                    style={styles.searchIcon}
                                />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search"
                                    placeholderTextColor="#8E8E93"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    selectionColor={CyberpunkTheme.primary}
                                />
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeDisplayButton}>
                                <Ionicons name="close" size={28} color={CyberpunkTheme.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Grid */}
                        <FlatList
                            data={filteredContacts}
                            renderItem={renderItem}
                            keyExtractor={item => item.id}
                            numColumns={3}
                            columnWrapperStyle={styles.columnWrapper}
                            contentContainerStyle={styles.gridContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        />

                        {/* Footer: Message Input + Send */}
                        <View style={styles.footer}>
                            <TextInput
                                style={styles.footerInput}
                                placeholder="Write a message..."
                                placeholderTextColor="#8E8E93"
                                value={messageText}
                                onChangeText={setMessageText}
                                selectionColor={CyberpunkTheme.primary}
                            />
                            <TouchableOpacity
                                onPress={handleSend}
                                disabled={!canSend}
                                style={[
                                    styles.sendButton,
                                    canSend ? styles.sendButtonActive : styles.sendButtonDisabled
                                ]}
                            >
                                <Ionicons name="arrow-up" size={20} color={canSend ? "#FFF" : "#8E8E93"} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    panel: {
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        padding: 24,
        maxHeight: '70%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    searchContainerFocused: {
        borderColor: CyberpunkTheme.primary,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
    },
    closeDisplayButton: {
        padding: 4,
    },
    gridContent: {
        paddingBottom: 20,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    gridItem: {
        width: '30%',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 8,
        borderRadius: 35, // Match avatar
        padding: 2, // Space for border
    },
    avatarSelected: {
        borderWidth: 2,
        borderColor: CyberpunkTheme.primary,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#333',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: CyberpunkTheme.primary,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1C1C1E',
        zIndex: 10,
    },
    groupIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: CyberpunkTheme.primary,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#1C1C1E',
    },
    nameText: {
        color: '#FFF',
        fontSize: 12,
        textAlign: 'center',
        fontWeight: '500',
    },
    footer: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        borderRadius: 24, // Pill shape
        padding: 6,
        paddingLeft: 16,
    },
    footerInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 15,
        height: 40,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonActive: {
        backgroundColor: CyberpunkTheme.primary,
    },
    sendButtonDisabled: {
        backgroundColor: '#3A3A3C',
    },
});
