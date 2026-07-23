import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signupWithSupabase } from '../../store/auth.store';
import CyberpunkTheme from '../../constants/Colors';

export default function SignupScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showVerificationMessage, setShowVerificationMessage] = useState(false);
    const router = useRouter();

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSignup = async () => {
        // Validation
        if (!email.trim()) {
            setError('Please enter your email');
            return;
        }
        if (!validateEmail(email.trim())) {
            setError('Please enter a valid email address');
            return;
        }
        if (!password) {
            setError('Please enter a password');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            const result = await signupWithSupabase(email.trim(), password);

            if (result.success) {
                // Check if email verification is required
                if (result.needsEmailVerification) {
                    setShowVerificationMessage(true);
                } else {
                    // Trigger auth refresh if no verification needed
                    if ((globalThis as any).refreshAuth) {
                        (globalThis as any).refreshAuth();
                    }
                }
            } else {
                // Handle specific Supabase errors
                if (result.error?.includes('already registered')) {
                    setError('An account with this email already exists');
                } else {
                    setError(result.error || 'Signup failed');
                }
            }
        } catch (e: any) {
            setError(e.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const goToLogin = () => {
        router.push('/(auth)/login');
    };

    // Show verification message after signup
    if (showVerificationMessage) {
        return (
            <View style={styles.container}>
                <View style={styles.verificationContainer}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="mail-outline" size={50} color={CyberpunkTheme.primary} />
                    </View>
                    <Text style={styles.verificationTitle}>Check Your Email</Text>
                    <Text style={styles.verificationSubtitle}>
                        We've sent a verification link to
                    </Text>
                    <Text style={styles.verificationEmail}>{email}</Text>
                    <Text style={styles.verificationHint}>
                        Tap the link in your email to verify your account and complete setup.
                    </Text>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={goToLogin}
                    >
                        <Text style={styles.secondaryButtonText}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.innerContainer}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join the community</Text>

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

                    <TextInput
                        style={styles.input}
                        placeholder="Confirm Password"
                        placeholderTextColor={CyberpunkTheme.textSecondary}
                        value={confirmPassword}
                        onChangeText={(text) => {
                            setConfirmPassword(text);
                            setError(null);
                        }}
                        secureTextEntry
                        editable={!isLoading}
                    />

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleSignup}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.buttonText}>Create Account</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={goToLogin} disabled={isLoading}>
                        <Text style={styles.linkText}>
                            Already have an account? <Text style={styles.linkBold}>Login</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CyberpunkTheme.background,
    },
    scrollContent: {
        flexGrow: 1,
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
    // Verification message styles
    verificationContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0, 212, 170, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    verificationTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: CyberpunkTheme.text,
        marginBottom: 12,
    },
    verificationSubtitle: {
        fontSize: 16,
        color: CyberpunkTheme.textSecondary,
        textAlign: 'center',
    },
    verificationEmail: {
        fontSize: 16,
        color: CyberpunkTheme.primary,
        fontWeight: '600',
        marginTop: 4,
        marginBottom: 24,
    },
    verificationHint: {
        fontSize: 14,
        color: CyberpunkTheme.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    secondaryButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: CyberpunkTheme.border,
    },
    secondaryButtonText: {
        color: CyberpunkTheme.text,
        fontSize: 16,
        fontWeight: '500',
    },
});
