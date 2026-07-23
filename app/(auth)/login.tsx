import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { loginWithSupabase } from '../../store/auth.store';
import CyberpunkTheme from '../../constants/Colors';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async () => {
        // Validation
        if (!email.trim()) {
            setError('Please enter your email');
            return;
        }
        if (!password) {
            setError('Please enter your password');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            const result = await loginWithSupabase(email.trim(), password);

            if (result.success) {
                // Let _layout.tsx guard handle navigation based on profile complete status
                if ((global as any).refreshAuth) {
                    (global as any).refreshAuth();
                }
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (e: any) {
            setError(e.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const goToSignup = () => {
        router.push('/(auth)/signup');
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.innerContainer}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to continue</Text>

                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={CyberpunkTheme.textSecondary}
                    value={email}
                    onChangeText={(text) => {
                        setEmail(text);
                        setError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={CyberpunkTheme.textSecondary}
                    value={password}
                    onChangeText={(text) => {
                        setPassword(text);
                        setError(null);
                    }}
                    secureTextEntry
                    editable={!isLoading}
                />

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.buttonText}>Login</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={goToSignup} disabled={isLoading}>
                    <Text style={styles.linkText}>
                        Don't have an account? <Text style={styles.linkBold}>Sign up</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CyberpunkTheme.background,
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: CyberpunkTheme.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: CyberpunkTheme.textSecondary,
        marginBottom: 40,
    },
    input: {
        width: '100%',
        height: 56,
        backgroundColor: CyberpunkTheme.surface,
        borderWidth: 1,
        borderColor: CyberpunkTheme.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        fontSize: 16,
        color: CyberpunkTheme.text,
    },
    button: {
        width: '100%',
        height: 56,
        backgroundColor: CyberpunkTheme.primary,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '600',
    },
    linkText: {
        color: CyberpunkTheme.textSecondary,
        fontSize: 16,
    },
    linkBold: {
        color: CyberpunkTheme.primary,
        fontWeight: '600',
    },
    errorContainer: {
        width: '100%',
        backgroundColor: 'rgba(255, 59, 48, 0.15)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        textAlign: 'center',
    },
});
