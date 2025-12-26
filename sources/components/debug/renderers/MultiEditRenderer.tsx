import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';
import { FileHeader } from '../components/FileHeader';
import { DiffLine } from '../components/DiffLine';
import { unescapeString } from '../utils/rendererHelpers';

/**
 * Specialized renderer for MultiEdit tool output
 * Displays multiple file edits in compact format
 */
export const MultiEditRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Parse MultiEdit tool output
    const edits = React.useMemo(() => {
        try {
            const parsed = typeof content === 'string' ? JSON.parse(content) : content;

            // MultiEdit should be an array of edit objects
            if (!Array.isArray(parsed)) {
                return null;
            }

            return parsed
                .filter(edit => edit.file_path && (edit.old_string || edit.new_string))
                .map(edit => ({
                    filePath: edit.file_path,
                    oldString: edit.old_string || '',
                    newString: edit.new_string || '',
                    replaceAll: edit.replace_all || false,
                }));
        } catch {
            return null;
        }
    }, [content]);

    // Fallback to plain text if not valid MultiEdit output
    if (!edits || edits.length === 0) {
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

    return (
        <View>
            {edits.map((edit, fileIndex) => {
                const oldLines = unescapeString(edit.oldString).split('\n');
                const newLines = unescapeString(edit.newString).split('\n');

                const diffLines: Array<{ type: 'remove' | 'add'; text: string }> = [];
                oldLines.forEach(line => diffLines.push({ type: 'remove', text: line }));
                newLines.forEach(line => diffLines.push({ type: 'add', text: line }));

                const badges = [];
                if (edit.replaceAll) {
                    badges.push({ text: 'REPLACE ALL', color: theme.colors.warning });
                }

                return (
                    <View key={fileIndex} style={{ marginBottom: fileIndex < edits.length - 1 ? 12 : 0 }}>
                        <FileHeader filePath={edit.filePath} badges={badges} />

                        <View
                            style={{
                                backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.02)',
                                borderRadius: 4,
                                padding: 8,
                            }}
                        >
                            {diffLines.map((line, index) => (
                                <DiffLine key={index} type={line.type} text={line.text} />
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
                            {oldLines.length} removed, {newLines.length} added
                        </Text>
                    </View>
                );
            })}

            <Text
                style={{
                    fontSize: 8,
                    color: theme.colors.textSecondary,
                    marginTop: 8,
                    fontStyle: 'italic',
                    fontWeight: '600',
                }}
            >
                {edits.length} file{edits.length !== 1 ? 's' : ''} modified
            </Text>
        </View>
    );
});

MultiEditRenderer.displayName = 'MultiEditRenderer';
