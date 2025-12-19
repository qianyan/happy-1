import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { BaseModal } from './BaseModal';
import { AlertModalConfig, ConfirmModalConfig } from '../types';
import { Typography } from '@/constants/Typography';
import { StyleSheet } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

interface WebAlertModalProps {
    config: AlertModalConfig | ConfirmModalConfig;
    onClose: () => void;
    onConfirm?: (value: boolean) => void;
}

export function WebAlertModal({ config, onClose, onConfirm }: WebAlertModalProps) {
    const { theme } = useUnistyles();
    const isConfirm = config.type === 'confirm';
    // Ref to prevent double-handling of button press (keyboard + click)
    const handledRef = useRef(false);

    const buttons = isConfirm
        ? [
            { text: config.cancelText || 'Cancel', style: 'cancel' as const },
            { text: config.confirmText || 'OK', style: config.destructive ? 'destructive' as const : 'default' as const }
        ]
        : config.buttons || [{ text: 'OK', style: 'default' as const }];

    const handleButtonPress = useCallback((buttonIndex: number) => {
        if (handledRef.current) return;
        handledRef.current = true;

        if (isConfirm && onConfirm) {
            onConfirm(buttonIndex === 1);
        } else if (!isConfirm && config.type === 'alert' && config.buttons?.[buttonIndex]?.onPress) {
            config.buttons[buttonIndex].onPress!();
        }
        onClose();
    }, [isConfirm, onConfirm, onClose, config]);

    // Keyboard support: Enter to confirm, Escape to cancel
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (handledRef.current) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                // Find the default/destructive button (non-cancel) and press it
                // For confirm dialogs, this is index 1; for alerts, find first non-cancel
                if (isConfirm) {
                    handleButtonPress(1); // Confirm button
                } else {
                    // For alert dialogs, find the first non-cancel button, or just the first button
                    const defaultIndex = buttons.findIndex(b => b.style !== 'cancel');
                    handleButtonPress(defaultIndex >= 0 ? defaultIndex : 0);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                // Find and press the cancel button, or just close
                if (isConfirm) {
                    handleButtonPress(0); // Cancel button
                } else {
                    const cancelIndex = buttons.findIndex(b => b.style === 'cancel');
                    if (cancelIndex >= 0) {
                        handleButtonPress(cancelIndex);
                    } else {
                        // No cancel button, just close
                        handledRef.current = true;
                        onClose();
                    }
                }
            }
        };

        // Use capture phase to handle keys before other elements (like text inputs)
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isConfirm, buttons, handleButtonPress, onClose]);

    const styles = StyleSheet.create({
        container: {
            backgroundColor: theme.colors.surface,
            borderRadius: 14,
            width: 270,
            overflow: 'hidden',
            shadowColor: theme.colors.shadow.color,
            shadowOffset: {
                width: 0,
                height: 2
            },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5
        },
        content: {
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 16,
            alignItems: 'center'
        },
        title: {
            fontSize: 17,
            textAlign: 'center',
            color: theme.colors.text,
            marginBottom: 4
        },
        message: {
            fontSize: 13,
            textAlign: 'center',
            color: theme.colors.text,
            marginTop: 4,
            lineHeight: 18
        },
        buttonContainer: {
            borderTopWidth: 1,
            borderTopColor: theme.colors.divider,
            flexDirection: 'row'
        },
        button: {
            flex: 1,
            paddingVertical: 11,
            alignItems: 'center',
            justifyContent: 'center'
        },
        buttonPressed: {
            backgroundColor: theme.colors.divider
        },
        buttonSeparator: {
            width: 1,
            backgroundColor: theme.colors.divider
        },
        buttonText: {
            fontSize: 17,
            color: theme.colors.textLink
        },
        cancelText: {
            fontWeight: '400'
        },
        destructiveText: {
            color: theme.colors.textDestructive
        }
    });

    return (
        <BaseModal visible={true} onClose={onClose} closeOnBackdrop={false}>
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={[styles.title, Typography.default('semiBold')]}>
                        {config.title}
                    </Text>
                    {config.message && (
                        <Text style={[styles.message, Typography.default()]}>
                            {config.message}
                        </Text>
                    )}
                </View>
                
                <View style={styles.buttonContainer}>
                    {buttons.map((button, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && <View style={styles.buttonSeparator} />}
                            <Pressable
                                style={({ pressed }) => [
                                    styles.button,
                                    pressed && styles.buttonPressed
                                ]}
                                onPress={() => handleButtonPress(index)}
                            >
                                <Text style={[
                                    styles.buttonText,
                                    button.style === 'cancel' && styles.cancelText,
                                    button.style === 'destructive' && styles.destructiveText,
                                    Typography.default(button.style === 'cancel' ? undefined : 'semiBold')
                                ]}>
                                    {button.text}
                                </Text>
                            </Pressable>
                        </React.Fragment>
                    ))}
                </View>
            </View>
        </BaseModal>
    );
}