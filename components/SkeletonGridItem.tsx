/**
 * SkeletonGridItem - Shimmer skeleton loader for content grid
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import CyberpunkTheme from '../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH / 3;
const ITEM_HEIGHT = COLUMN_WIDTH * (4 / 3); // 3:4 aspect ratio

interface SkeletonGridItemProps {
    index?: number;
}

export default function SkeletonGridItem({ index = 0 }: SkeletonGridItemProps) {
    const shimmerPosition = useSharedValue(-1);

    useEffect(() => {
        shimmerPosition.value = withRepeat(
            withTiming(1, { duration: 1200 }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            shimmerPosition.value,
            [-1, 1],
            [-COLUMN_WIDTH, COLUMN_WIDTH * 2]
        );
        return {
            transform: [{ translateX }],
        };
    });

    return (
        <View style={styles.container}>
            <View style={styles.skeleton}>
                <Animated.View style={[styles.shimmer, animatedStyle]}>
                    <LinearGradient
                        colors={[
                            'transparent',
                            'rgba(255, 255, 255, 0.1)',
                            'transparent',
                        ]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: COLUMN_WIDTH,
        height: ITEM_HEIGHT,
        padding: 1,
    },
    skeleton: {
        flex: 1,
        backgroundColor: CyberpunkTheme.surface,
        borderRadius: 2,
        overflow: 'hidden',
    },
    shimmer: {
        width: COLUMN_WIDTH,
        height: '100%',
    },
});
