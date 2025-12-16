import * as React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusDot } from './StatusDot';
import { Typography } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useUnistyles } from 'react-native-unistyles';
import { t } from '@/text';
import { TranscriptionStatus, cancelRecording } from '@/services/whisperTranscription';

interface RecordingStatusBarProps {
    status: TranscriptionStatus;
    style?: any;
}

export const RecordingStatusBar = React.memo(({ status, style }: RecordingStatusBarProps) => {
    const { theme } = useUnistyles();

    // Don't render if idle
    if (status === 'idle') {
        return null;
    }

    const handleCancel = () => {
        cancelRecording();
    };

    const getStatusInfo = () => {
        switch (status) {
            case 'recording':
                return {
                    color: theme.colors.status.error, // Red pulsing dot for recording
                    backgroundColor: theme.colors.surfaceHighest,
                    isPulsing: true,
                    text: t('voiceAssistant.status.recording'),
                    textColor: theme.colors.text,
                    icon: 'mic' as const,
                };
            case 'transcribing':
                return {
                    color: theme.colors.status.connecting,
                    backgroundColor: theme.colors.surfaceHighest,
                    isPulsing: true,
                    text: t('voiceAssistant.status.transcribing'),
                    textColor: theme.colors.text,
                    icon: 'cloud-upload' as const,
                };
            case 'error':
                return {
                    color: theme.colors.status.error,
                    backgroundColor: theme.colors.surfaceHighest,
                    isPulsing: false,
                    text: t('voiceAssistant.status.error'),
                    textColor: theme.colors.text,
                    icon: 'alert-circle' as const,
                };
            default:
                return {
                    color: theme.colors.status.default,
                    backgroundColor: theme.colors.surfaceHighest,
                    isPulsing: false,
                    text: t('voiceAssistant.status.idle'),
                    textColor: theme.colors.text,
                    icon: 'mic' as const,
                };
        }
    };

    const statusInfo = getStatusInfo();

    return (
        <View style={[{
            backgroundColor: statusInfo.backgroundColor,
            height: 32,
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 16,
        }, style]}>
            <View style={styles.content}>
                {/* Left section - status info */}
                <View style={styles.leftSection}>
                    <StatusDot
                        color={statusInfo.color}
                        isPulsing={statusInfo.isPulsing}
                        size={8}
                        style={styles.statusDot}
                    />
                    <Ionicons
                        name={statusInfo.icon}
                        size={16}
                        color={statusInfo.textColor}
                        style={styles.micIcon}
                    />
                    <Text style={[
                        styles.statusText,
                        { color: statusInfo.textColor }
                    ]}>
                        {statusInfo.text}
                    </Text>
                </View>

                {/* Right section - cancel button */}
                <View style={styles.rightSection}>
                    {status === 'recording' && (
                        <Pressable
                            onPress={handleCancel}
                            style={({ pressed }) => [
                                styles.cancelButton,
                                pressed && styles.buttonPressed
                            ]}
                            hitSlop={10}
                        >
                            <Text style={[styles.buttonText, { color: statusInfo.textColor }]}>
                                {t('voiceAssistant.cancel')}
                            </Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 12,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cancelButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    buttonPressed: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: 12,
        fontWeight: '500',
        ...Typography.default(),
    },
    statusDot: {
        marginRight: 6,
    },
    micIcon: {
        marginRight: 6,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '500',
        ...Typography.default(),
    },
});
