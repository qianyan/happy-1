import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';
import { getFileIcon } from '../utils/rendererHelpers';

/**
 * Specialized renderer for Grep tool output
 * Displays search results with pattern highlighting and file grouping
 */
export const GrepRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Parse Grep output - can be string with file:line:content format or structured
    const grepResults = React.useMemo(() => {
        const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        const lines = textContent.split('\n').filter(line => line.trim());

        // Group by file
        const grouped = new Map<string, Array<{ line: number; content: string }>>();

        lines.forEach(line => {
            // Try to parse file:line:content or file:line format
            const match = line.match(/^(.+?):(\d+):(.+)$/) || line.match(/^(.+?):(\d+)$/);
            if (match) {
                const [, filePath, lineNum, lineContent = ''] = match;
                if (!grouped.has(filePath)) {
                    grouped.set(filePath, []);
                }
                grouped.get(filePath)!.push({
                    line: parseInt(lineNum, 10),
                    content: lineContent,
                });
            } else {
                // Fallback: treat as ungrouped result
                if (!grouped.has('Results')) {
                    grouped.set('Results', []);
                }
                grouped.get('Results')!.push({
                    line: 0,
                    content: line,
                });
            }
        });

        return grouped;
    }, [content]);

    if (grepResults.size === 0) {
        return (
            <Text
                style={{
                    fontSize: 9,
                    color: theme.colors.textSecondary,
                    fontStyle: 'italic',
                }}
            >
                No matches found
            </Text>
        );
    }

    return (
        <View>
            {Array.from(grepResults.entries()).map(([filePath, matches], fileIndex) => {
                const fileName = filePath.split('/').pop() || filePath;
                const icon = getFileIcon(filePath);

                return (
                    <View key={fileIndex} style={{ marginBottom: fileIndex < grepResults.size - 1 ? 10 : 0 }}>
                        {/* File header */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                paddingVertical: 3,
                                paddingHorizontal: 6,
                                backgroundColor: theme.dark ? 'rgba(233, 30, 99, 0.15)' : 'rgba(233, 30, 99, 0.1)',
                                borderRadius: 3,
                                marginBottom: 4,
                            }}
                        >
                            <Text style={{ fontSize: 9 }}>{icon}</Text>
                            <Text
                                style={{
                                    fontSize: 9,
                                    fontWeight: '600',
                                    color: theme.colors.text,
                                    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                }}
                                selectable
                            >
                                {fileName}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 8,
                                    color: theme.colors.textSecondary,
                                    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                }}
                            >
                                ({matches.length} match{matches.length !== 1 ? 'es' : ''})
                            </Text>
                        </View>

                        {/* Matches */}
                        <View
                            style={{
                                backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.02)',
                                borderRadius: 4,
                                padding: 6,
                            }}
                        >
                            {matches.map((match, matchIndex) => (
                                <View
                                    key={matchIndex}
                                    style={{
                                        flexDirection: 'row',
                                        paddingVertical: 1,
                                        paddingHorizontal: 2,
                                    }}
                                >
                                    {match.line > 0 && (
                                        <Text
                                            style={{
                                                fontSize: 8,
                                                lineHeight: 12,
                                                color: '#FF69B4',
                                                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                                marginRight: 6,
                                                width: 30,
                                                textAlign: 'right',
                                                fontWeight: '600',
                                            }}
                                        >
                                            {match.line}
                                        </Text>
                                    )}
                                    <Text
                                        style={{
                                            fontSize: 8,
                                            lineHeight: 12,
                                            color: theme.colors.text,
                                            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                            flex: 1,
                                        }}
                                        selectable
                                    >
                                        {match.content}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                );
            })}

            <Text
                style={{
                    fontSize: 8,
                    color: theme.colors.textSecondary,
                    marginTop: 6,
                    fontStyle: 'italic',
                }}
            >
                {Array.from(grepResults.values()).reduce((sum, matches) => sum + matches.length, 0)} total matches in {grepResults.size} file{grepResults.size !== 1 ? 's' : ''}
            </Text>
        </View>
    );
});

GrepRenderer.displayName = 'GrepRenderer';
