import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';
import { FileHeader } from '../components/FileHeader';
import { unescapeString, getCodeHighlightColor } from '../utils/rendererHelpers';

/**
 * Specialized renderer for Read tool output
 * Displays file content with syntax highlighting and line numbers
 */
export const ReadRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Parse Read tool output
    const readData = React.useMemo(() => {
        try {
            const parsed = typeof content === 'string' ? JSON.parse(content) : content;

            if (!parsed.file_path) {
                return null;
            }

            return {
                filePath: parsed.file_path,
                content: parsed.content || '',
                offset: parsed.offset,
                limit: parsed.limit,
            };
        } catch {
            return null;
        }
    }, [content]);

    // Fallback to plain text if not valid Read output
    if (!readData) {
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

    const unescapedContent = unescapeString(readData.content);
    const lines = unescapedContent.split('\n');
    const startLineNumber = (readData.offset || 0) + 1;

    const badges = [];
    if (readData.offset !== undefined && readData.limit !== undefined) {
        badges.push({
            text: `Lines ${startLineNumber}-${startLineNumber + lines.length - 1}`,
            color: theme.colors.textSecondary
        });
    }

    return (
        <View>
            <FileHeader filePath={readData.filePath} badges={badges} />

            <View
                style={{
                    backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 4,
                    padding: 8,
                }}
            >
                {lines.map((line, index) => {
                    const lineNumber = startLineNumber + index;
                    const highlightColor = getCodeHighlightColor(line, theme);

                    return (
                        <View
                            key={index}
                            style={{
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
                                    width: 40,
                                    textAlign: 'right',
                                }}
                            >
                                {lineNumber}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 9,
                                    lineHeight: 13,
                                    color: highlightColor,
                                    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                    flex: 1,
                                }}
                                selectable
                            >
                                {line}
                            </Text>
                        </View>
                    );
                })}
            </View>

            <Text
                style={{
                    fontSize: 8,
                    color: theme.colors.textSecondary,
                    marginTop: 4,
                    fontStyle: 'italic',
                }}
            >
                {lines.length} lines displayed
            </Text>
        </View>
    );
});

ReadRenderer.displayName = 'ReadRenderer';
