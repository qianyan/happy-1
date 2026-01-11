import * as React from 'react';
import { View, Text, Platform, ScrollView } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';

/**
 * Table renderer for debug panel
 * Renders markdown tables and array-of-objects as compact tables
 */
export const TableRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    const monospaceFontFamily = Platform.select({
        ios: 'Menlo',
        android: 'monospace',
        default: 'monospace'
    });

    // Parse table data
    const tableData = React.useMemo(() => {
        return parseTable(content);
    }, [content]);

    if (!tableData) {
        // Fallback to plain text if parsing fails
        return (
            <Text
                style={{
                    fontSize: 9,
                    lineHeight: 13,
                    color: theme.colors.text,
                    fontFamily: monospaceFontFamily,
                }}
                selectable
            >
                {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
            </Text>
        );
    }

    const { headers, rows, alignments } = tableData;

    // Helper to get text alignment style
    const getTextAlign = (index: number): 'left' | 'center' | 'right' => {
        if (!alignments || !alignments[index]) return 'left';
        return alignments[index];
    };

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginVertical: 4 }}
        >
            <View
                style={{
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                    borderRadius: 4,
                    overflow: 'hidden',
                }}
            >
                {/* Header Row */}
                <View
                    style={{
                        flexDirection: 'row',
                        backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        borderBottomWidth: 2,
                        borderBottomColor: theme.colors.divider,
                    }}
                >
                    {headers.map((header, index) => (
                        <View
                            key={index}
                            style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                minWidth: 80,
                                maxWidth: 200,
                                borderRightWidth: index < headers.length - 1 ? 1 : 0,
                                borderRightColor: theme.colors.divider,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 9,
                                    fontWeight: '700',
                                    color: theme.colors.text,
                                    fontFamily: monospaceFontFamily,
                                    textAlign: getTextAlign(index),
                                }}
                                numberOfLines={1}
                                selectable
                            >
                                {header}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Data Rows */}
                {rows.map((row, rowIndex) => (
                    <View
                        key={rowIndex}
                        style={{
                            flexDirection: 'row',
                            backgroundColor: rowIndex % 2 === 0
                                ? 'transparent'
                                : theme.dark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                            borderBottomWidth: rowIndex < rows.length - 1 ? 1 : 0,
                            borderBottomColor: theme.colors.divider,
                        }}
                    >
                        {row.map((cell, cellIndex) => (
                            <View
                                key={cellIndex}
                                style={{
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    minWidth: 80,
                                    maxWidth: 200,
                                    borderRightWidth: cellIndex < row.length - 1 ? 1 : 0,
                                    borderRightColor: theme.colors.divider,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 8,
                                        lineHeight: 12,
                                        color: theme.colors.textSecondary,
                                        fontFamily: monospaceFontFamily,
                                        textAlign: getTextAlign(cellIndex),
                                    }}
                                    numberOfLines={3}
                                    selectable
                                >
                                    {cell}
                                </Text>
                            </View>
                        ))}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
});

export type TableAlignment = 'left' | 'center' | 'right';

export interface ParsedTable {
    headers: string[];
    rows: string[][];
    alignments?: TableAlignment[];
}

/**
 * Parse table from various formats:
 * 1. Markdown table
 * 2. Array of objects
 * 3. Array of arrays
 */
function parseTable(content: any): ParsedTable | null {
    // Try parsing as markdown table
    if (typeof content === 'string') {
        const markdownTable = parseMarkdownTable(content);
        if (markdownTable) return markdownTable;
    }

    // Try parsing as array of objects
    if (Array.isArray(content) && content.length > 0) {
        if (typeof content[0] === 'object' && !Array.isArray(content[0])) {
            return parseArrayOfObjects(content);
        }

        // Try parsing as array of arrays
        if (Array.isArray(content[0])) {
            return parseArrayOfArrays(content);
        }
    }

    // Try parsing JSON string
    if (typeof content === 'string') {
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                return parseTable(parsed); // Recursively parse
            }
        } catch {
            // Not JSON
        }
    }

    return null;
}

/**
 * Check if a line contains unescaped pipe characters
 */
function hasUnescapedPipe(line: string): boolean {
    let i = 0;
    while (i < line.length) {
        if (line[i] === '\\' && i + 1 < line.length) {
            i += 2; // Skip escaped character
        } else if (line[i] === '|') {
            return true; // Found unescaped pipe
        } else {
            i++;
        }
    }
    return false;
}

/**
 * Parse markdown table format
 * Example:
 * | Header 1 | Header 2 |
 * |----------|----------|
 * | Cell 1   | Cell 2   |
 */
function parseMarkdownTable(text: string): ParsedTable | null {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null; // At least header + separator

    // Check if first line contains unescaped pipes
    if (!hasUnescapedPipe(lines[0])) return null;

    // Parse header row
    const headers = parsePipeDelimitedRow(lines[0]);
    if (headers.length === 0) return null;

    // Check separator line (second line should have dashes)
    if (lines.length < 2 || !lines[1].includes('-')) return null;

    // Parse alignments from separator line
    const alignments = parseAlignments(lines[1], headers.length);

    // Parse data rows (skip header and separator)
    const rows: string[][] = [];
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!hasUnescapedPipe(line)) continue;

        const cells = parsePipeDelimitedRow(line);

        // Pad or truncate to match header count
        while (cells.length < headers.length) {
            cells.push('');
        }
        if (cells.length > headers.length) {
            cells.length = headers.length;
        }

        rows.push(cells);
    }

    // Allow empty tables (header only)
    return { headers, rows, alignments };
}

/**
 * Parse alignment from separator line
 * Examples:
 * - :--- → left
 * - :---: → center
 * - ---: → right
 * - --- → left (default)
 */
function parseAlignments(separatorLine: string, columnCount: number): TableAlignment[] {
    const separators = parsePipeDelimitedRow(separatorLine);
    const alignments: TableAlignment[] = [];

    for (let i = 0; i < columnCount; i++) {
        const sep = separators[i] || '';
        const trimmed = sep.trim();

        const startsWithColon = trimmed.startsWith(':');
        const endsWithColon = trimmed.endsWith(':');

        if (startsWithColon && endsWithColon) {
            alignments.push('center');
        } else if (endsWithColon) {
            alignments.push('right');
        } else {
            alignments.push('left'); // Default or starts with colon
        }
    }

    return alignments;
}

/**
 * Parse a pipe-delimited row, handling both formats:
 * - With outer pipes: | A | B | C |
 * - Without outer pipes: A | B | C
 * - With escaped pipes: | A \| B | C | (the \| inside cell is treated as literal |)
 */
function parsePipeDelimitedRow(line: string): string[] {
    const trimmed = line.trim();

    // Remove leading and trailing pipes if present
    let content = trimmed;
    if (content.startsWith('|')) {
        content = content.substring(1);
    }
    if (content.endsWith('|')) {
        content = content.substring(0, content.length - 1);
    }

    // Split on unescaped pipes only, and unescape the result
    const parts: string[] = [];
    let current = '';
    let i = 0;

    while (i < content.length) {
        if (content[i] === '\\' && i + 1 < content.length) {
            // Escaped character - add the next character literally
            current += content[i + 1];
            i += 2;
        } else if (content[i] === '|') {
            // Unescaped pipe - this is a delimiter
            parts.push(current.trim());
            current = '';
            i++;
        } else {
            current += content[i];
            i++;
        }
    }
    // Add the last part
    parts.push(current.trim());

    return parts.filter(cell => cell.length > 0);
}

/**
 * Parse array of objects into table
 * Example: [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }]
 */
function parseArrayOfObjects(arr: any[]): ParsedTable {
    // Get all unique keys from all objects
    const allKeys = new Set<string>();
    arr.forEach(obj => {
        Object.keys(obj).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const rows = arr.map(obj => {
        return headers.map(header => {
            const value = obj[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') {
                return JSON.stringify(value);
            }
            return String(value);
        });
    });

    return { headers, rows };
}

/**
 * Parse array of arrays into table
 * First row is treated as headers
 * Example: [['Name', 'Age'], ['John', 30], ['Jane', 25]]
 */
function parseArrayOfArrays(arr: any[][]): ParsedTable | null {
    if (arr.length < 2) return null;

    const headers = arr[0].map(h => String(h));
    const rows = arr.slice(1).map(row => {
        return row.map(cell => {
            if (cell === null || cell === undefined) return '';
            if (typeof cell === 'object') {
                return JSON.stringify(cell);
            }
            return String(cell);
        });
    });

    return { headers, rows };
}

TableRenderer.displayName = 'TableRenderer';
