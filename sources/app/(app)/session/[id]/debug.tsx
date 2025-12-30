import * as React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSession, useSessionMessages, useIsDataReady } from '@/sync/storage';
import { DebugTranscriptPanel } from '@/components/DebugTranscriptPanel';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/text';
import { Typography } from '@/constants/Typography';

/**
 * Debug screen for viewing the complete session transcript
 * Shows all messages with detailed information for debugging
 */
export default React.memo(function DebugScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const sessionId = id || '';
    const session = useSession(sessionId);
    const { messages } = useSessionMessages(sessionId);
    const isDataReady = useIsDataReady();
    const { theme } = useUnistyles();

    if (!isDataReady) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface }}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            </View>
        );
    }

    if (!session) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface }}>
                <Ionicons name="trash-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={{ color: theme.colors.text, fontSize: 20, marginTop: 16, ...Typography.default('semiBold') }}>
                    {t('errors.sessionDeleted')}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 15, marginTop: 8, textAlign: 'center', paddingHorizontal: 32, ...Typography.default() }}>
                    {t('errors.sessionDeletedDescription')}
                </Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
            <DebugTranscriptPanel
                messages={messages}
                metadata={session.metadata}
                selectedMessageId={null}
            />
        </View>
    );
});
