import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';

/**
 * Specialized renderer for Edit tool output
 * Displays old_string and new_string as a readable diff
 */
export const EditRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Parse Edit tool output
    const editData = React.useMemo(() => {
        try {
            // Content might be a string or already parsed object
            const parsed = typeof content === 'string' ? JSON.parse(content) : content;

            if (!parsed.file_path || (!parsed.old_string && !parsed.new_string)) {
                return null; // Not valid Edit tool output
            }

            return {
                filePath: parsed.file_path || '',
                oldString: parsed.old_string || '',
                newString: parsed.new_string || '',
                replaceAll: parsed.replace_all || false,
            };
        } catch {
            return null;
        }
    }, [content]);

    // Unescape string literals (convert \n to actual newlines, etc.)
    const unescapeString = (str: string): string => {
        return str
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\\\/g, '\\');
    };

    // Generate diff lines
    const diffLines = React.useMemo(() => {
        if (!editData) return null;

        const oldLines = unescapeString(editData.oldString).split('\n');
        const newLines = unescapeString(editData.newString).split('\n');

        const lines: Array<{ type: 'remove' | 'add' | 'context'; text: string }> = [];

        // Simple diff: show all old lines as removed, then all new lines as added
        // For more sophisticated diff, could use a library like diff-match-patch
        oldLines.forEach(line => {
            lines.push({ type: 'remove', text: line });
        });

        newLines.forEach(line => {
            lines.push({ type: 'add', text: line });
        });

        return lines;
    }, [editData]);

    // Fallback to plain text if not valid Edit output
    if (!editData || !diffLines) {
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

    // Get file name from path
    const fileName = editData.filePath.split('/').pop() || editData.filePath;

    return (
        <View>
            {/* File header */}
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
                <Text style={{ fontSize: 10 }}>📄</Text>
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
                {editData.replaceAll && (
                    <Text
                        style={{
                            fontSize: 8,
                            color: theme.colors.warning,
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                        }}
                    >
                        REPLACE ALL
                    </Text>
                )}
            </View>

            {/* Diff content */}
            <View
                style={{
                    backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 4,
                    padding: 8,
                }}
            >
                {diffLines.map((line, index) => {
                    const symbol = line.type === 'remove' ? '- ' : line.type === 'add' ? '+ ' : '  ';
                    // Use theme diff colors - black text with subtle backgrounds
                    const color =
                        line.type === 'remove'
                            ? theme.colors.diff.removedText // Black text
                            : line.type === 'add'
                            ? theme.colors.diff.addedText // Black text
                            : theme.colors.diff.contextText; // Gray text

                    const bgColor =
                        line.type === 'remove'
                            ? theme.dark ? 'rgba(255, 238, 240, 0.05)' : 'rgba(255, 238, 240, 0.5)' // Very subtle red
                            : line.type === 'add'
                            ? theme.dark ? 'rgba(230, 255, 237, 0.05)' : 'rgba(230, 255, 237, 0.5)' // Very subtle green
                            : 'transparent';

                    return (
                        <View
                            key={index}
                            style={{
                                backgroundColor: bgColor,
                                paddingHorizontal: 4,
                                paddingVertical: 1,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 9,
                                    lineHeight: 13,
                                    color,
                                    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                }}
                                selectable
                            >
                                {symbol}{line.text}
                            </Text>
                        </View>
                    );
                })}
            </View>

            {/* Stats */}
            <Text
                style={{
                    fontSize: 8,
                    color: theme.colors.textSecondary,
                    marginTop: 4,
                    fontStyle: 'italic',
                }}
            >
                {diffLines.filter(l => l.type === 'remove').length} removed, {diffLines.filter(l => l.type === 'add').length} added
            </Text>
        </View>
    );
});

EditRenderer.displayName = 'EditRenderer';
