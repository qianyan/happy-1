import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { DebugContentRendererProps, ContentType } from './types';
import { detectContentType, getRendererHints, truncateContent } from './utils';
import {
    PlainTextRenderer,
    JsonRenderer,
    AnsiRenderer,
    ErrorRenderer,
    MarkdownRenderer,
    TableRenderer,
    EditRenderer,
    WriteRenderer,
    MultiEditRenderer,
    NotebookEditRenderer,
    ReadRenderer,
    GrepRenderer,
    GlobRenderer,
    BashRenderer,
    WebFetchRenderer,
    WebSearchRenderer,
    TaskRenderer,
    TodoWriteRenderer,
} from './renderers';

/**
 * Smart content renderer for debug panel
 * Automatically detects content type and applies appropriate rendering
 */
export const DebugContentRenderer = React.memo<DebugContentRendererProps>((props) => {
    const { content, type, toolName, compact = false, maxLength = 50000, forceRenderer } = props;
    const { theme } = useUnistyles();

    // Detect content type
    const detectedType: ContentType = React.useMemo(() => {
        if (forceRenderer) {
            return forceRenderer;
        }
        return detectContentType(content);
    }, [content, forceRenderer]);

    // Get renderer hints based on tool and content type
    const hints = React.useMemo(() => {
        return getRendererHints(toolName, detectedType, type);
    }, [toolName, detectedType, type]);

    // Truncate content if too long
    const { content: processedContent, truncated } = React.useMemo(() => {
        if (typeof content === 'string') {
            return truncateContent(content, maxLength);
        }
        return { content, truncated: false };
    }, [content, maxLength]);

    // Select and render appropriate renderer
    const renderContent = () => {
        const rendererType = hints.renderer || detectedType;
        const isDark = theme.dark;

        const baseProps = {
            content: processedContent,
            type,
            compact,
            maxLength,
            theme: (isDark ? 'dark' : 'light') as 'light' | 'dark',
        };

        switch (rendererType) {
            case 'json-object':
            case 'json-string':
            case 'array':
                return <JsonRenderer {...baseProps} />;

            case 'ansi-text':
                return <AnsiRenderer {...baseProps} />;

            case 'markdown':
                return <MarkdownRenderer {...baseProps} />;

            case 'table':
                return <TableRenderer {...baseProps} />;

            case 'error':
                return <ErrorRenderer {...baseProps} />;

            case 'edit':
                return <EditRenderer {...baseProps} />;

            case 'write':
                return <WriteRenderer {...baseProps} />;

            case 'multi-edit':
                return <MultiEditRenderer {...baseProps} />;

            case 'notebook-edit':
                return <NotebookEditRenderer {...baseProps} />;

            case 'read':
                return <ReadRenderer {...baseProps} />;

            case 'grep':
                return <GrepRenderer {...baseProps} />;

            case 'glob':
                return <GlobRenderer {...baseProps} />;

            case 'bash':
                const bashResult = <BashRenderer {...baseProps} />;
                // BashRenderer returns null if not valid, fallback to normal rendering
                return bashResult || <PlainTextRenderer {...baseProps} />;

            case 'web-fetch':
                const webFetchResult = <WebFetchRenderer {...baseProps} />;
                return webFetchResult || <PlainTextRenderer {...baseProps} />;

            case 'web-search':
                const webSearchResult = <WebSearchRenderer {...baseProps} />;
                return webSearchResult || <PlainTextRenderer {...baseProps} />;

            case 'task':
                const taskResult = <TaskRenderer {...baseProps} />;
                return taskResult || <PlainTextRenderer {...baseProps} />;

            case 'todo-write':
                const todoResult = <TodoWriteRenderer {...baseProps} />;
                return todoResult || <JsonRenderer {...baseProps} />;

            case 'number':
            case 'boolean':
            case 'null':
                // Render primitives as plain text
                return <PlainTextRenderer {...baseProps} />;

            case 'plain-text':
            default:
                return <PlainTextRenderer {...baseProps} />;
        }
    };

    return (
        <View>
            {renderContent()}
            {truncated && (
                <Text
                    style={{
                        fontSize: 9,
                        color: theme.colors.warning,
                        marginTop: 4,
                        fontStyle: 'italic',
                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                    }}
                >
                    ... Content truncated ({maxLength.toLocaleString()} char limit)
                </Text>
            )}
        </View>
    );
});

DebugContentRenderer.displayName = 'DebugContentRenderer';
