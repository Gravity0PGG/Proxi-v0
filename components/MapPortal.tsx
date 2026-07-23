import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_RADIUS = Math.sqrt(Math.pow(SCREEN_WIDTH, 2) + Math.pow(SCREEN_HEIGHT, 2));

interface MapPortalProps {
    x: number;
    y: number;
    trigger: number; // Use a timestamp or counter to trigger animation
    onAnimationComplete: () => void;
}

export default function MapPortal({ x, y, trigger, onAnimationComplete }: MapPortalProps) {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (trigger > 0) {
            // Reset
            scaleAnim.setValue(0);

            // Animate
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 450,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) {
                    onAnimationComplete();
                }
            });
        }
    }, [trigger]); // Only run when trigger value changes

    return (
        <View
            style={[styles.container, { left: x, top: y }]}
            pointerEvents="none"
        >
            <Animated.View
                style={[
                    styles.circle,
                    {
                        transform: [
                            { scale: scaleAnim },
                        ],
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: 0,
        height: 0,
        zIndex: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    circle: {
        width: MAX_RADIUS * 2,
        height: MAX_RADIUS * 2,
        borderRadius: MAX_RADIUS,
        backgroundColor: 'black',
        marginLeft: -MAX_RADIUS,
        marginTop: -MAX_RADIUS,
    },
});
