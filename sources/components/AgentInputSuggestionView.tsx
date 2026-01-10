import * as React from 'react';
import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/Typography';
import { t } from '@/text';

interface CommandSuggestionProps {
    command: string;
    description?: string;
    argumentHint?: string;
    scope?: 'builtin' | 'project' | 'personal';
    namespace?: string;
}

export const CommandSuggestion = React.memo(({ command, description, argumentHint, scope, namespace }: CommandSuggestionProps) => {
    // Determine scope label for custom commands
    const scopeLabel = scope === 'project' ? 'project' : scope === 'personal' ? 'personal' : undefined;
    const displayLabel = namespace ? `${namespace}` : scopeLabel;

    return (
        <View style={styles.suggestionContainer}>
            <Text
                style={[styles.commandText, { marginRight: 8 }]}
            >
                /{command}
            </Text>
            {argumentHint && (
                <Text style={styles.argumentHintText}>
                    {argumentHint}
                </Text>
            )}
            {description && (
                <Text
                    style={styles.descriptionText}
                    numberOfLines={1}
                >
                    {description}
                </Text>
            )}
            {displayLabel && (
                <Text style={styles.scopeLabel}>
                    {displayLabel}
                </Text>
            )}
        </View>
    );
});

interface FileMentionProps {
    fileName: string;
    filePath: string;
    fileType?: 'file' | 'folder';
}

export const FileMentionSuggestion = React.memo(({ fileName, filePath, fileType = 'file' }: FileMentionProps) => {
    return (
        <View style={styles.suggestionContainer}>
            <View style={styles.iconContainer}>
                <Ionicons
                    name={fileType === 'folder' ? 'folder' : 'document-text'}
                    size={18}
                    color={styles.iconColor.color}
                />
            </View>
            <Text 
                style={styles.fileNameText}
                numberOfLines={1}
            >
                {filePath}{fileName}
            </Text>
            <Text style={styles.labelText}>
                {fileType === 'folder' ? t('agentInput.suggestion.folderLabel') : t('agentInput.suggestion.fileLabel')}
            </Text>
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    suggestionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 48,
    },
    commandText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '600',
        ...Typography.default('semiBold'),
    },
    descriptionText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    argumentHintText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        opacity: 0.7,
        marginRight: 8,
        ...Typography.default(),
    },
    scopeLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        opacity: 0.8,
        backgroundColor: theme.colors.surfaceHigh,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
        ...Typography.default(),
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.surfaceHigh,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconColor: {
        color: theme.colors.textSecondary,
    },
    fileNameText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    labelText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginLeft: 8,
        ...Typography.default(),
    },
}));
