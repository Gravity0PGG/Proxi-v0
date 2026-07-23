import React, { useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import MapView from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MapScreen() {
    const router = useRouter();

    // Native Animated Values
    const overlayScale = useRef(new Animated.Value(0)).current;
    const touchX = useRef(0);
    const touchY = useRef(0);
    const targetCoords = useRef({ lat: 0, lng: 0 });

    // Guard against multiple navigations
    const isNavigating = useRef(false);

    const initialRegion = {
        latitude: 20.0,
        longitude: 0.0,
        latitudeDelta: 80.0,
        longitudeDelta: 80.0,
    };

    // Reset portal when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            overlayScale.setValue(0);
            isNavigating.current = false;
        }, [])
    );

    const handleMapPress = (event: any) => {
        if (isNavigating.current) return;

        const { coordinate, position } = event.nativeEvent;

        // Capture data
        touchX.current = position.x;
        touchY.current = position.y;
        targetCoords.current = { lat: coordinate.latitude, lng: coordinate.longitude };

        isNavigating.current = true;

        // Reset and animate
        overlayScale.setValue(0);

        Animated.timing(overlayScale, {
            toValue: 25, // Scale up to 25x (covers screen)
            duration: 400,
            useNativeDriver: true, // CRITICAL: Uses native thread
        }).start(({ finished }) => {
            if (finished) {
                // Navigate ONLY after animation completes
                router.push({
                    pathname: '/(tabs)/feed',
                    params: {
                        lat: targetCoords.current.lat,
                        lng: targetCoords.current.lng
                    }
                });
            }
        });
    };

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={initialRegion}
                showsUserLocation={true}
                onPress={handleMapPress}
            />

            {/* Inline Portal Overlay */}
            <Animated.View
                style={[
                    styles.portal,
                    {
                        left: touchX.current - 50, // Center on tap (50 = half of 100)
                        top: touchY.current - 50,
                        transform: [{ scale: overlayScale }],
                    },
                ]}
                pointerEvents="none"
            />
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
    portal: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50, // Perfect circle
        backgroundColor: 'black',
        zIndex: 9999,
    },
});
