import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { getFileIcon, extractFileName } from '../utils/rendererHelpers';

interface FileHeaderProps {
    filePath: string;
    badges?: Array<{ text: string; color: string }>;
    showFullPath?: boolean;
}

/**
 * Shared file header component for debug renderers
 * Displays file icon, name, and optional badges
 */
export const FileHeader = React.memo<FileHeaderProps>((props) => {
    const { filePath, badges, showFullPath = false } = props;
    const { theme } = useUnistyles();

    const fileName = showFullPath ? filePath : extractFileName(filePath);
    const icon = getFileIcon(filePath);

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 4,
                paddingHorizontal: 8,
                backgroundColor: theme.dark ? 'rgba(100, 100, 100, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                borderRadius: 4,
                marginBottom: 6,
            }}
        >
            <Text style={{ fontSize: 10 }}>{icon}</Text>
            <Text
                style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: theme.colors.text,
                    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                }}
                selectable
            >
                {fileName}
            </Text>
            {badges?.map((badge, index) => (
                <Text
                    key={index}
                    style={{
                        fontSize: 8,
                        color: badge.color,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                    }}
                >
                    {badge.text}
                </Text>
            ))}
        </View>
    );
});

FileHeader.displayName = 'FileHeader';
