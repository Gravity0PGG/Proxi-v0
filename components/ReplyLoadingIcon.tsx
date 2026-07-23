import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedProps, SharedValue, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import CyberpunkTheme from '../constants/Colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
    progress: SharedValue<number>; // 0 to 1
    size?: number;
}

export default function ReplyLoadingIcon({ progress, size = 28 }: Props) {
    const strokeWidth = 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Animate the stroke dash offset to simulate filling
    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: circumference * (1 - Math.min(progress.value, 1)),
    }));

    // Arrow Scale & Opacity (Pops in at 100%)
    const rArrowStyle = useAnimatedStyle(() => {
        // Trigger pop around 0.95-1.0
        const scale = interpolate(progress.value, [0, 1], [0.8, 1], 'clamp');
        return {
            transform: [{ scale }],
            opacity: 1
        };
    });

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            {/* SVG Circle */}
            <Svg width={size} height={size}>
                {/* Background Track (Subtle) */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress Fill */}
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={CyberpunkTheme.primary}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={`${circumference} ${circumference}`}
                    animatedProps={animatedProps}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${size / 2}, ${size / 2}`}
                />
            </Svg>

            {/* Arrow Icon (Overlay) */}
            <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 10 }, rArrowStyle]}>
                <Ionicons name="arrow-undo" size={size * 0.45} color={CyberpunkTheme.primary} />
            </Animated.View>
        </View>
    );
}
