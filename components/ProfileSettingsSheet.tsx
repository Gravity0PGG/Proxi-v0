/**
 * ProfileSettingsSheet - Bottom sheet with profile settings
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Pressable,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import CyberpunkTheme from '../constants/Colors';

interface ProfileSettingsSheetProps {
    visible: boolean;
    onClose: () => void;
    onLogout: () => void;
    onSavedItems: () => void;
    isPrivate: boolean;
    onPrivacyToggle: (value: boolean) => void;
}

export default function ProfileSettingsSheet({
    visible,
    onClose,
    onLogout,
    onSavedItems,
    isPrivate,
    onPrivacyToggle,
}: ProfileSettingsSheetProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} />
            </Pressable>

            <View style={styles.sheet}>
                <View style={styles.handle} />

                <Text style={styles.title}>Settings</Text>

                {/* Privacy Toggle */}
                <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                        <Ionicons
                            name={isPrivate ? 'lock-closed-outline' : 'earth-outline'}
                            size={24}
                            color={CyberpunkTheme.text}
                        />
                        <View style={styles.settingTextContainer}>
                            <Text style={styles.settingLabel}>Account Privacy</Text>
                            <Text style={styles.settingHint}>
                                {isPrivate ? 'Private account' : 'Public account'}
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={isPrivate}
                        onValueChange={onPrivacyToggle}
                        trackColor={{
                            false: CyberpunkTheme.border,
                            true: CyberpunkTheme.primary,
                        }}
                        thumbColor="#fff"
                    />
                </View>

                {/* Saved Items */}
                <TouchableOpacity style={styles.settingRow} onPress={onSavedItems}>
                    <View style={styles.settingLeft}>
                        <Ionicons
                            name="bookmark-outline"
                            size={24}
                            color={CyberpunkTheme.text}
                        />
                        <View style={styles.settingTextContainer}>
                            <Text style={styles.settingLabel}>Saved Items</Text>
                            <Text style={styles.settingHint}>Your saved stickers & posts</Text>
                        </View>
                    </View>
                    <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={CyberpunkTheme.textSecondary}
                    />
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                    <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                {/* Cancel */}
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: CyberpunkTheme.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderColor: CyberpunkTheme.border,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: CyberpunkTheme.textSecondary,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: CyberpunkTheme.text,
        textAlign: 'center',
        marginBottom: 20,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingTextContainer: {
        marginLeft: 16,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: CyberpunkTheme.text,
    },
    settingHint: {
        fontSize: 13,
        color: CyberpunkTheme.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: CyberpunkTheme.border,
        marginVertical: 8,
        marginHorizontal: 20,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#FF3B30',
        marginLeft: 16,
    },
    cancelButton: {
        alignItems: 'center',
        paddingVertical: 16,
        marginTop: 8,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: CyberpunkTheme.textSecondary,
    },
});
