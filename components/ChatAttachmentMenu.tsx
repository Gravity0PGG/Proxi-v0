import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Platform,
    Alert,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import CyberpunkTheme from '../constants/Colors';

interface ChatAttachmentMenuProps {
    visible: boolean;
    onClose: () => void;
    onPhotoSelected?: (uri: string) => void;
    onVideoSelected?: (uri: string) => void;
    onLocationSelected?: (coords: { latitude: number; longitude: number }) => void;
    onStickerSelected?: () => void;
}

export default function ChatAttachmentMenu({
    visible,
    onClose,
    onPhotoSelected,
    onVideoSelected,
    onLocationSelected,
    onStickerSelected,
}: ChatAttachmentMenuProps) {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    useEffect(() => {
        if (visible) {
            // Trigger haptic on menu open
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            // Smooth slide up with timing (no bounce)
            opacity.value = withTiming(1, { duration: 200 });
            translateY.value = withTiming(0, { duration: 200 });
        } else {
            opacity.value = withTiming(0, { duration: 150 });
            translateY.value = withTiming(20, { duration: 150 });
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    const handlePress = (callback: () => void) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        callback();
    };

    const handleCameraPress = async () => {
        handlePress(async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Camera Access Required',
                    'Please enable camera access in your settings to take photos.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: false,
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                console.log('Camera capture:', asset.uri, asset.type);

                if (asset.type === 'video') {
                    onVideoSelected?.(asset.uri);
                } else {
                    onPhotoSelected?.(asset.uri);
                }
                onClose();
            }
        });
    };

    const handleGalleryPress = async () => {
        handlePress(async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Photo Library Access',
                    'Please enable access to your photos to share them.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: false, // Share originally as it is
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                console.log('Media selected:', result.assets[0].uri);
                onPhotoSelected?.(result.assets[0].uri);
                onClose();
            }
        });
    };

    const handleStickerPress = () => {
        handlePress(() => {
            onStickerSelected?.();
            onClose();
        });
    };

    const handleLocationPress = async () => {
        handlePress(async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Location Access Required',
                    'Please enable location access to share your position.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
                return;
            }

            try {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                console.log('Location:', {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });

                onLocationSelected?.({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
                onClose();
            } catch (error) {
                console.error('Error getting location:', error);
                Alert.alert('Error', 'Could not get your current location');
            }
        });
    };

    if (!visible) return null;

    return (
        <>
            {/* Transparent Overlay - No Blur */}
            <Pressable style={styles.overlay} onPress={onClose} />

            {/* Sleek Vertical List Menu */}
            <Animated.View style={[styles.menu, animatedStyle]}>
                {/* Camera Row */}
                <TouchableOpacity
                    style={styles.row}
                    onPress={handleCameraPress}
                    activeOpacity={0.6}
                >
                    <Ionicons name="camera-outline" size={24} color={CyberpunkTheme.primary} style={styles.icon} />
                    <Text style={styles.text}>Camera</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* Gallery Row */}
                <TouchableOpacity
                    style={styles.row}
                    onPress={handleGalleryPress}
                    activeOpacity={0.6}
                >
                    <Ionicons name="image-outline" size={24} color={CyberpunkTheme.primary} style={styles.icon} />
                    <Text style={styles.text}>Gallery</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* Sticker Row */}
                <TouchableOpacity
                    style={styles.row}
                    onPress={handleStickerPress}
                    activeOpacity={0.6}
                >
                    <Ionicons name="happy-outline" size={24} color={CyberpunkTheme.primary} style={styles.icon} />
                    <Text style={styles.text}>Sticker</Text>
                </TouchableOpacity>
            </Animated.View>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'transparent',
        zIndex: 998,
    },
    menu: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 105 : 95,
        left: 16,
        width: 140, // Narrower width
        backgroundColor: '#111111', // Dark grey matte
        borderRadius: 12,
        paddingVertical: 6,
        zIndex: 999,
        // Subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center', // Vertical centering
        justifyContent: 'flex-start', // Align left to form columns
        paddingVertical: 10,
        paddingHorizontal: 16, // Slightly more padding
    },
    icon: {
        marginRight: 12,
        width: 28, // Slightly wider for 24px icons
        textAlign: 'center',
    },
    text: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
        lineHeight: 20,
    },
    divider: {
        height: 0.5,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginHorizontal: 12,
    },
});
