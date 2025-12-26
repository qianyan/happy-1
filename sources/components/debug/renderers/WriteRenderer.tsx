import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';
import { FileHeader } from '../components/FileHeader';
import { unescapeString } from '../utils/rendererHelpers';

/**
 * Specialized renderer for Write tool output
 * Displays file creation with content preview
 */
export const WriteRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Parse Write tool output
    const writeData = React.useMemo(() => {
        try {
            const parsed = typeof content === 'string' ? JSON.parse(content) : content;

            if (!parsed.file_path || !parsed.content) {
                return null;
            }

            return {
                filePath: parsed.file_path,
                content: parsed.content,
            };
        } catch {
            return null;
        }
    }, [content]);

    // Fallback to plain text if not valid Write output
    if (!writeData) {
        const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        return (
            <Text
                style={{
                    fontSize: 10,
                    lineHeight: 14,
                    color: theme.colors.debug.plain,
                    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                }}
                selectable
            >
                {textContent}
            </Text>
        );
    }

    const unescapedContent = unescapeString(writeData.content);
    const lines = unescapedContent.split('\n');

    return (
        <View>
            <FileHeader
                filePath={writeData.filePath}
                badges={[{ text: 'NEW FILE', color: theme.colors.success }]}
            />

            <View
                style={{
                    backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 4,
                    padding: 8,
                }}
            >
                {lines.map((line, index) => (
                    <View
                        key={index}
                        style={{
                            backgroundColor: theme.dark ? 'rgba(80, 250, 123, 0.1)' : 'rgba(80, 250, 123, 0.08)',
                            paddingHorizontal: 4,
                            paddingVertical: 1,
                            flexDirection: 'row',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 8,
                                lineHeight: 13,
                                color: theme.colors.textSecondary,
                                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                marginRight: 8,
                                width: 30,
                                textAlign: 'right',
                            }}
                        >
                            {index + 1}
                        </Text>
                        <Text
                            style={{
                                fontSize: 9,
                                lineHeight: 13,
                                color: '#50FA7B',
                                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                flex: 1,
                            }}
                            selectable
                        >
                            + {line}
                        </Text>
                    </View>
                ))}
            </View>

            <Text
                style={{
                    fontSize: 8,
                    color: theme.colors.textSecondary,
                    marginTop: 4,
                    fontStyle: 'italic',
                }}
            >
                {lines.length} lines added
            </Text>
        </View>
    );
});

WriteRenderer.displayName = 'WriteRenderer';
