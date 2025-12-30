import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';
import { DiffLine } from '../components/DiffLine';
import { unescapeString, extractFileName } from '../utils/rendererHelpers';

/**
 * Specialized renderer for NotebookEdit tool output
 * Displays Jupyter notebook cell edits with cell metadata
 */
export const NotebookEditRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Parse NotebookEdit tool output
    const notebookData = React.useMemo(() => {
        try {
            const parsed = typeof content === 'string' ? JSON.parse(content) : content;

            if (!parsed.notebook_path || !parsed.new_source) {
                return null;
            }

            return {
                notebookPath: parsed.notebook_path,
                cellId: parsed.cell_id,
                cellType: parsed.cell_type || 'code',
                newSource: parsed.new_source,
                editMode: parsed.edit_mode || 'replace',
            };
        } catch {
            return null;
        }
    }, [content]);

    // Fallback to plain text if not valid NotebookEdit output
    if (!notebookData) {
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

    const fileName = extractFileName(notebookData.notebookPath);
    const lines = unescapeString(notebookData.newSource).split('\n');

    const cellTypeColor = notebookData.cellType === 'code' ? theme.colors.radio.active : theme.colors.warning;
    const modeText = notebookData.editMode === 'insert' ? 'INSERT' : notebookData.editMode === 'delete' ? 'DELETE' : 'REPLACE';
    const modeColor = notebookData.editMode === 'insert' ? theme.colors.success : notebookData.editMode === 'delete' ? '#FF5555' : theme.colors.warning;

    return (
        <View>
            {/* Notebook header */}
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
                <Text style={{ fontSize: 10 }}>📓</Text>
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
                {notebookData.cellId && (
                    <Text
                        style={{
                            fontSize: 8,
                            color: cellTypeColor,
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                        }}
                    >
                        CELL: {notebookData.cellType}
                    </Text>
                )}
                <Text
                    style={{
                        fontSize: 8,
                        color: modeColor,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                    }}
                >
                    {modeText}
                </Text>
            </View>

            {/* Cell content */}
            <View
                style={{
                    backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 4,
                    padding: 8,
                }}
            >
                {lines.map((line, index) => {
                    const lineType = notebookData.editMode === 'insert' || notebookData.editMode === 'replace'
                        ? 'add'
                        : notebookData.editMode === 'delete'
                        ? 'remove'
                        : 'context';

                    return (
                        <DiffLine key={index} type={lineType} text={line} lineNumber={index + 1} />
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
                {lines.length} lines in cell
            </Text>
        </View>
    );
});

NotebookEditRenderer.displayName = 'NotebookEditRenderer';
