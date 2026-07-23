import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CreateScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraRef, setCameraRef] = useState<CameraView | null>(null);



    const handleShutterPress = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (cameraRef) {
            try {
                const photo = await cameraRef.takePictureAsync();
                console.log('Photo taken:', photo);
                // TODO: Handle the photo (save, upload, etc.)
            } catch (error) {
                console.error('Error taking picture:', error);
            }
        }
    };

    // Loading state while checking permissions
    if (!permission) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading camera...</Text>
            </View>
        );
    }

    // Permission denied - show request UI
    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <StatusBar style="dark" />
                <Ionicons name="camera-outline" size={80} color="#999" />
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionText}>
                    PROXI needs access to your camera to create content
                </Text>
                <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={requestPermission}
                    activeOpacity={0.8}
                >
                    <Text style={styles.permissionButtonText}>Grant Access</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    activeOpacity={0.8}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Camera UI
    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Full-screen Camera */}
            <CameraView
                style={styles.camera}
                facing="back"
                ref={(ref) => setCameraRef(ref)}
            />

            {/* Shutter Button - Bottom Center (absolute over camera) */}
            <View style={styles.shutterContainer}>
                <TouchableOpacity
                    onPress={handleShutterPress}
                    activeOpacity={0.8}
                    style={styles.shutterButton}
                >
                    <BlurView
                        intensity={80}
                        tint="light"
                        style={styles.shutterBlur}
                    >
                        <View style={styles.shutterInner} />
                    </BlurView>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        color: '#000',
    },
    permissionText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 40,
    },
    permissionButton: {
        backgroundColor: '#000',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 25,
        marginBottom: 15,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        paddingHorizontal: 30,
        paddingVertical: 12,
    },
    backButtonText: {
        color: '#666',
        fontSize: 16,
    },

    shutterContainer: {
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 100,
    },
    shutterButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
        shadowColor: '#ff6902',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    shutterBlur: {
        flex: 1,
        width: '100%',
        height: '100%',
        borderRadius: 40,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shutterInner: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
    },
});
