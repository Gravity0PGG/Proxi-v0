import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface CreatorOrbProps {
    onPress: () => void;
    size?: number;
}

export default function CreatorOrb({ onPress, size = 60 }: CreatorOrbProps) {
    const handlePress = () => {
        // Trigger light haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.8}
            style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
        >
            <BlurView
                intensity={80}
                tint="light"
                style={[styles.blurContainer, { borderRadius: size / 2 }]}
            >
                <View style={[styles.innerCircle, { borderRadius: size / 2 }]}>
                    <Ionicons name="add" size={32} color="white" />
                </View>
            </BlurView>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 8,
    },
    blurContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    innerCircle: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
});
