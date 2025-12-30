import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';
import { getFileIcon } from '../utils/rendererHelpers';

/**
 * Specialized renderer for Glob tool output
 * Displays file listings in tree structure with file icons
 */
export const GlobRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Parse Glob output - typically a list of file paths
    const { files, tree } = React.useMemo(() => {
        const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        const paths = textContent.split('\n').filter(line => line.trim());

        // Build tree structure
        const treeMap = new Map<string, Set<string>>();

        paths.forEach(path => {
            const parts = path.split('/');
            for (let i = 0; i < parts.length; i++) {
                const dirPath = parts.slice(0, i).join('/') || '/';
                const item = parts[i];
                if (!treeMap.has(dirPath)) {
                    treeMap.set(dirPath, new Set());
                }
                if (item) {
                    treeMap.get(dirPath)!.add(item);
                }
            }
        });

        return { files: paths, tree: treeMap };
    }, [content]);

    if (files.length === 0) {
        return (
            <Text
                style={{
                    fontSize: 9,
                    color: theme.colors.textSecondary,
                    fontStyle: 'italic',
                }}
            >
                No files found
            </Text>
        );
    }

    // Simple flat list with icons (tree structure would be too complex for compact debug panel)
    return (
        <View>
            <View
                style={{
                    backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 4,
                    padding: 6,
                }}
            >
                {files.slice(0, 50).map((filePath, index) => {
                    const fileName = filePath.split('/').pop() || filePath;
                    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
                    const icon = getFileIcon(filePath);

                    return (
                        <View
                            key={index}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                paddingVertical: 2,
                                paddingHorizontal: 4,
                            }}
                        >
                            <Text style={{ fontSize: 9 }}>{icon}</Text>
                            <Text
                                style={{
                                    fontSize: 9,
                                    color: theme.colors.text,
                                    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                    fontWeight: '600',
                                }}
                                selectable
                            >
                                {fileName}
                            </Text>
                            {dirPath && (
                                <Text
                                    style={{
                                        fontSize: 8,
                                        color: theme.colors.textSecondary,
                                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                        flex: 1,
                                    }}
                                    numberOfLines={1}
                                    selectable
                                >
                                    {dirPath}
                                </Text>
                            )}
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
                {files.length} file{files.length !== 1 ? 's' : ''} found{files.length > 50 ? ' (showing first 50)' : ''}
            </Text>
        </View>
    );
});

GlobRenderer.displayName = 'GlobRenderer';
