/**
 * Toast notification provider and display component
 *
 * Renders toasts at the top of the screen with animations.
 * Wrap your app with this provider to enable Toast notifications.
 */

import React, { useCallback, useEffect, useRef, memo } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/Typography';
import { ToastConfig, ToastType } from './types';
import { Toast } from './ToastManager';

interface ToastItemProps {
    toast: ToastConfig;
    onDismiss: (id: string) => void;
}

const ToastItem = memo(function ToastItem({ toast, onDismiss }: ToastItemProps) {
    const { theme } = useUnistyles();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-20)).current;

    // Get colors and icon based on toast type
    const getToastStyle = (type: ToastType) => {
        switch (type) {
            case 'error':
                return {
                    backgroundColor: theme.colors.box.error.background,
                    borderColor: theme.colors.box.error.border,
                    textColor: theme.colors.box.error.text,
                    icon: 'alert-circle' as const,
                };
            case 'warning':
                return {
                    backgroundColor: theme.colors.box.warning.background,
                    borderColor: theme.colors.box.warning.border,
                    textColor: theme.colors.box.warning.text,
                    icon: 'warning' as const,
                };
            case 'success':
                return {
                    backgroundColor: theme.colors.success,
                    borderColor: theme.colors.success,
                    textColor: '#fff',
                    icon: 'checkmark-circle' as const,
                };
            case 'info':
            default:
                return {
                    backgroundColor: theme.colors.surfaceHigh,
                    borderColor: theme.colors.divider,
                    textColor: theme.colors.text,
                    icon: 'information-circle' as const,
                };
        }
    };

    const style = getToastStyle(toast.type);

    useEffect(() => {
        // Animate in
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto-dismiss if duration is set
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => {
                handleDismiss();
            }, toast.duration);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = useCallback(() => {
        // Animate out
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: -20,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss(toast.id);
            toast.onDismiss?.();
        });
    }, [toast.id, onDismiss, toast.onDismiss]);

    return (
        <Animated.View
            style={[
                styles.toastContainer,
                {
                    backgroundColor: style.backgroundColor,
                    borderColor: style.borderColor,
                    opacity: fadeAnim,
                    transform: [{ translateY }],
                },
            ]}
        >
            <View style={styles.toastContent}>
                <Ionicons name={style.icon} size={20} color={style.textColor} style={styles.icon} />
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: style.textColor }]}>{toast.title}</Text>
                    {toast.message && (
                        <Text style={[styles.message, { color: style.textColor }]}>{toast.message}</Text>
                    )}
                </View>
                <Pressable onPress={handleDismiss} style={styles.closeButton} hitSlop={8}>
                    <Ionicons name="close" size={18} color={style.textColor} />
                </Pressable>
            </View>
        </Animated.View>
    );
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const insets = useSafeAreaInsets();
    const [toasts, setToasts] = React.useState<ToastConfig[]>([]);
    const toastIdRef = useRef(0);

    const showToast = useCallback((config: Omit<ToastConfig, 'id'>): string => {
        const id = `toast-${++toastIdRef.current}`;
        const newToast: ToastConfig = { ...config, id };
        setToasts((prev) => [...prev, newToast]);
        return id;
    }, []);

    const hideToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Register with ToastManager
    useEffect(() => {
        Toast.setFunctions(showToast, hideToast);
        return () => Toast.clearFunctions();
    }, [showToast, hideToast]);

    return (
        <>
            {children}
            <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={hideToast} />
                ))}
            </View>
        </>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 9999,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    toastContainer: {
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
        maxWidth: 500,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
    },
    icon: {
        marginRight: 10,
        marginTop: 1,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        ...Typography.default('semiBold'),
    },
    message: {
        fontSize: 13,
        marginTop: 2,
        ...Typography.default(),
    },
    closeButton: {
        marginLeft: 8,
        padding: 2,
    },
}));
