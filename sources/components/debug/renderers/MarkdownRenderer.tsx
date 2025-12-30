import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';
import { TableRenderer } from './TableRenderer';

/**
 * Lightweight markdown renderer for debug panel
 * Supports basic markdown syntax with compact formatting
 * Special handling for <system-reminder> tags
 */
export const MarkdownRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Convert content to string
    const textContent = React.useMemo(() => {
        return typeof content === 'string' ? content : String(content);
    }, [content]);

    // Check if content contains system-reminder tags
    const hasSystemReminder = textContent.includes('<system-reminder>');

    // Parse markdown into renderable elements
    const elements = React.useMemo(() => {
        return parseMarkdown(textContent, hasSystemReminder);
    }, [textContent, hasSystemReminder]);

    const monospaceFontFamily = Platform.select({
        ios: 'Menlo',
        android: 'monospace',
        default: 'monospace'
    });

    const renderElement = (element: MarkdownElement, index: number) => {
        switch (element.type) {
            case 'heading':
                return (
                    <Text
                        key={index}
                        style={{
                            fontSize: element.level === 1 ? 12 : element.level === 2 ? 11 : 10,
                            fontWeight: '700',
                            color: theme.colors.text,
                            marginTop: index > 0 ? 6 : 0,
                            marginBottom: 2,
                        }}
                        selectable
                    >
                        {element.content}
                    </Text>
                );

            case 'code-block':
                return (
                    <View
                        key={index}
                        style={{
                            backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)',
                            borderRadius: 4,
                            padding: 6,
                            marginVertical: 4,
                            borderLeftWidth: 2,
                            borderLeftColor: theme.colors.warning,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 9,
                                lineHeight: 13,
                                color: theme.dark ? '#D4D4D4' : '#24292F',
                                fontFamily: monospaceFontFamily,
                            }}
                            selectable
                        >
                            {element.content}
                        </Text>
                    </View>
                );

            case 'table':
                return (
                    <View key={index}>
                        <TableRenderer
                            content={element.content}
                            compact={props.compact}
                            theme={props.theme}
                        />
                    </View>
                );

            case 'list-item':
                return (
                    <View
                        key={index}
                        style={{
                            flexDirection: 'row',
                            marginVertical: 1,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 9,
                                color: theme.colors.textSecondary,
                                marginRight: 4,
                            }}
                        >
                            •
                        </Text>
                        {renderInlineText(element.content, theme, monospaceFontFamily)}
                    </View>
                );

            case 'paragraph':
                return (
                    <View key={index} style={{ marginVertical: 2 }}>
                        {renderInlineText(element.content, theme, monospaceFontFamily)}
                    </View>
                );

            case 'system-reminder':
                return (
                    <View
                        key={index}
                        style={{
                            backgroundColor: theme.dark ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)',
                            borderLeftWidth: 3,
                            borderLeftColor: theme.colors.warning,
                            borderRadius: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            marginVertical: 4,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 8,
                                fontWeight: '700',
                                color: theme.colors.warning,
                                fontFamily: monospaceFontFamily,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                marginBottom: 4,
                            }}
                            selectable
                        >
                            ⚠️ SYSTEM REMINDER
                        </Text>
                        <Text
                            style={{
                                fontSize: 9,
                                lineHeight: 13,
                                color: theme.colors.text,
                                fontFamily: monospaceFontFamily,
                            }}
                            selectable
                        >
                            {element.content}
                        </Text>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <View>
            {elements.map((element, index) => renderElement(element, index))}
        </View>
    );
});

// Render text with inline formatting (bold, italic, inline code, links)
function renderInlineText(text: string, theme: any, monospaceFontFamily: string) {
    const segments = parseInlineFormatting(text);

    return (
        <Text
            style={{
                fontSize: 9,
                lineHeight: 13,
                color: theme.colors.text,
            }}
            selectable
        >
            {segments.map((segment, index) => {
                if (segment.type === 'bold') {
                    return (
                        <Text key={index} style={{ fontWeight: '700' }}>
                            {segment.text}
                        </Text>
                    );
                } else if (segment.type === 'italic') {
                    return (
                        <Text key={index} style={{ fontStyle: 'italic' }}>
                            {segment.text}
                        </Text>
                    );
                } else if (segment.type === 'code') {
                    return (
                        <Text
                            key={index}
                            style={{
                                fontFamily: monospaceFontFamily,
                                fontSize: 8,
                                backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                                paddingHorizontal: 3,
                                paddingVertical: 1,
                                borderRadius: 2,
                                color: theme.dark ? '#E5C07B' : '#D73A49',
                            }}
                        >
                            {segment.text}
                        </Text>
                    );
                } else if (segment.type === 'link') {
                    return (
                        <Text
                            key={index}
                            style={{
                                color: theme.colors.radio.active,
                                textDecorationLine: 'underline',
                            }}
                        >
                            {segment.text}
                        </Text>
                    );
                } else {
                    return <Text key={index}>{segment.text}</Text>;
                }
            })}
        </Text>
    );
}

// Parse markdown into block elements
function parseMarkdown(text: string, hasSystemReminder: boolean = false): MarkdownElement[] {
    // Handle system reminders first if present
    if (hasSystemReminder) {
        const parts = text.split(/(<system-reminder>[\s\S]*?<\/system-reminder>)/);
        const elements: MarkdownElement[] = [];

        parts.forEach(part => {
            if (part.match(/<system-reminder>[\s\S]*?<\/system-reminder>/)) {
                // Extract system reminder content
                const reminderContent = part
                    .replace(/<system-reminder>/, '')
                    .replace(/<\/system-reminder>/, '')
                    .trim();

                elements.push({
                    type: 'system-reminder',
                    content: reminderContent,
                });
            } else if (part.trim().length > 0) {
                // Parse the rest as normal markdown
                elements.push(...parseMarkdownContent(part));
            }
        });

        return elements;
    }

    return parseMarkdownContent(text);
}

// Parse markdown content (without system reminders)
function parseMarkdownContent(text: string): MarkdownElement[] {
    const lines = text.split('\n');
    const elements: MarkdownElement[] = [];
    let currentCodeBlock: string[] = [];
    let currentTable: string[] = [];
    let inCodeBlock = false;
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Code block detection
        if (line.trim().startsWith('```')) {
            // End any table first
            if (inTable && currentTable.length > 0) {
                elements.push({
                    type: 'table',
                    content: currentTable.join('\n'),
                });
                currentTable = [];
                inTable = false;
            }

            if (inCodeBlock) {
                // End code block
                elements.push({
                    type: 'code-block',
                    content: currentCodeBlock.join('\n'),
                });
                currentCodeBlock = [];
                inCodeBlock = false;
            } else {
                // Start code block
                inCodeBlock = true;
            }
            continue;
        }

        if (inCodeBlock) {
            currentCodeBlock.push(line);
            continue;
        }

        // Table detection - line with pipes
        if (line.includes('|') && line.trim().length > 0) {
            if (!inTable) {
                inTable = true;
            }
            currentTable.push(line);
            continue;
        } else if (inTable) {
            // End of table
            if (currentTable.length > 0) {
                elements.push({
                    type: 'table',
                    content: currentTable.join('\n'),
                });
                currentTable = [];
            }
            inTable = false;
        }

        // Headings
        const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
        if (headingMatch) {
            elements.push({
                type: 'heading',
                level: headingMatch[1].length as 1 | 2 | 3,
                content: headingMatch[2],
            });
            continue;
        }

        // List items
        if (line.trim().match(/^[-*]\s+(.+)$/)) {
            const content = line.trim().replace(/^[-*]\s+/, '');
            elements.push({
                type: 'list-item',
                content,
            });
            continue;
        }

        // Empty lines - skip
        if (line.trim() === '') {
            continue;
        }

        // Regular paragraph
        elements.push({
            type: 'paragraph',
            content: line,
        });
    }

    // Handle unclosed code block
    if (inCodeBlock && currentCodeBlock.length > 0) {
        elements.push({
            type: 'code-block',
            content: currentCodeBlock.join('\n'),
        });
    }

    // Handle unclosed table
    if (inTable && currentTable.length > 0) {
        elements.push({
            type: 'table',
            content: currentTable.join('\n'),
        });
    }

    return elements;
}

// Parse inline formatting (bold, italic, code, links)
function parseInlineFormatting(text: string): InlineSegment[] {
    const segments: InlineSegment[] = [];
    let currentText = '';
    let i = 0;

    while (i < text.length) {
        // Bold: **text**
        if (text.slice(i, i + 2) === '**') {
            if (currentText) {
                segments.push({ type: 'text', text: currentText });
                currentText = '';
            }
            const endIndex = text.indexOf('**', i + 2);
            if (endIndex !== -1) {
                segments.push({
                    type: 'bold',
                    text: text.slice(i + 2, endIndex),
                });
                i = endIndex + 2;
                continue;
            }
        }

        // Inline code: `text`
        if (text[i] === '`') {
            if (currentText) {
                segments.push({ type: 'text', text: currentText });
                currentText = '';
            }
            const endIndex = text.indexOf('`', i + 1);
            if (endIndex !== -1) {
                segments.push({
                    type: 'code',
                    text: text.slice(i + 1, endIndex),
                });
                i = endIndex + 1;
                continue;
            }
        }

        // Italic: *text* (but not **)
        if (text[i] === '*' && text[i + 1] !== '*') {
            if (currentText) {
                segments.push({ type: 'text', text: currentText });
                currentText = '';
            }
            const endIndex = text.indexOf('*', i + 1);
            if (endIndex !== -1 && text[endIndex + 1] !== '*') {
                segments.push({
                    type: 'italic',
                    text: text.slice(i + 1, endIndex),
                });
                i = endIndex + 1;
                continue;
            }
        }

        // Links: [text](url)
        if (text[i] === '[') {
            const closeBracket = text.indexOf(']', i);
            if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
                const closeParen = text.indexOf(')', closeBracket + 2);
                if (closeParen !== -1) {
                    if (currentText) {
                        segments.push({ type: 'text', text: currentText });
                        currentText = '';
                    }
                    segments.push({
                        type: 'link',
                        text: text.slice(i + 1, closeBracket),
                    });
                    i = closeParen + 1;
                    continue;
                }
            }
        }

        currentText += text[i];
        i++;
    }

    if (currentText) {
        segments.push({ type: 'text', text: currentText });
    }

    return segments;
}

type MarkdownElement =
    | { type: 'heading'; level: 1 | 2 | 3; content: string }
    | { type: 'code-block'; content: string }
    | { type: 'table'; content: string }
    | { type: 'list-item'; content: string }
    | { type: 'paragraph'; content: string }
    | { type: 'system-reminder'; content: string };

type InlineSegment =
    | { type: 'text'; text: string }
    | { type: 'bold'; text: string }
    | { type: 'italic'; text: string }
    | { type: 'code'; text: string }
    | { type: 'link'; text: string };

MarkdownRenderer.displayName = 'MarkdownRenderer';
