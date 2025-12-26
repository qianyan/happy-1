import { ContentType } from '../types';

/**
 * Detects the content type of the given content for appropriate rendering
 */
export function detectContentType(content: any): ContentType {
    // 1. Handle null/undefined
    if (content === null || content === undefined) {
        return 'null';
    }

    // 2. Handle primitive types
    if (typeof content === 'number') {
        return 'number';
    }

    if (typeof content === 'boolean') {
        return 'boolean';
    }

    // 3. Handle objects (already parsed)
    if (typeof content === 'object') {
        return Array.isArray(content) ? 'array' : 'json-object';
    }

    // 4. Handle strings - detect format
    if (typeof content === 'string') {
        const trimmed = content.trim();

        // Empty string
        if (!trimmed) {
            return 'plain-text';
        }

        // Check for ANSI escape codes
        // Pattern: \x1b[...m or \u001b[...m
        if (/\x1b\[[0-9;]*m|\u001b\[[0-9;]*m/.test(content)) {
            return 'ansi-text';
        }

        // Check for error patterns
        // - Starts with "Error:" or "Error "
        // - Contains stack trace patterns like "at functionName (file:line:col)"
        if (
            /^Error[:\s]/i.test(trimmed) ||
            /^\w+Error[:\s]/i.test(trimmed) || // TypeError, ReferenceError, etc.
            /at .+\(.+:\d+:\d+\)/.test(content) || // Stack trace
            /at .+ \[as .+\]/.test(content) // Named stack trace
        ) {
            return 'error';
        }

        // Try parsing as JSON
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                JSON.parse(trimmed);
                return 'json-string';
            } catch {
                // Not valid JSON, continue
            }
        }

        // Default to plain text
        return 'plain-text';
    }

    // 5. Unknown type
    return 'unknown';
}

/**
 * Get renderer hints based on tool name, content type, and whether it's input or output
 */
export function getRendererHints(toolName: string | undefined, contentType: ContentType, type?: 'input' | 'output') {
    if (!toolName) {
        return { renderer: contentType };
    }

    // Special handling for tool inputs that benefit from custom rendering
    if (type === 'input') {
        switch (toolName) {
            case 'Edit':
                return {
                    renderer: 'edit' as ContentType,
                    preserveWhitespace: true,
                };
            case 'MultiEdit':
                return {
                    renderer: 'multi-edit' as ContentType,
                    preserveWhitespace: true,
                };
            case 'Write':
                return {
                    renderer: 'write' as ContentType,
                    preserveWhitespace: true,
                };
            case 'NotebookEdit':
                return {
                    renderer: 'notebook-edit' as ContentType,
                    preserveWhitespace: true,
                };
            default:
                return { renderer: contentType };
        }
    }

    // Tool-specific rendering preferences for outputs
    switch (toolName) {
        case 'Bash':
        case 'BashOutput':
            return {
                renderer: contentType === 'ansi-text' ? 'ansi-text' : contentType,
                preserveWhitespace: true,
            };

        case 'Read':
            return {
                renderer: 'read' as ContentType,
                preserveWhitespace: true,
            };

        case 'Write':
            return {
                renderer: 'write' as ContentType,
                preserveWhitespace: true,
            };

        case 'Edit':
            return {
                renderer: 'edit' as ContentType,
                preserveWhitespace: true,
            };

        case 'MultiEdit':
            return {
                renderer: 'multi-edit' as ContentType,
                preserveWhitespace: true,
            };

        case 'NotebookEdit':
            return {
                renderer: 'notebook-edit' as ContentType,
                preserveWhitespace: true,
            };

        case 'Grep':
            return {
                renderer: 'grep' as ContentType,
                preserveWhitespace: true,
            };

        case 'Glob':
            return {
                renderer: 'glob' as ContentType,
                preserveWhitespace: true,
            };

        case 'WebFetch':
            return {
                renderer: 'web-fetch' as ContentType,
                compact: true,
            };

        case 'WebSearch':
            return {
                renderer: 'web-search' as ContentType,
            };

        case 'Task':
            return {
                renderer: 'task' as ContentType,
            };

        case 'TodoWrite':
            return {
                renderer: 'todo-write' as ContentType,
            };

        default:
            return { renderer: contentType };
    }
}

/**
 * Truncate content if it exceeds max length
 */
export function truncateContent(content: string, maxLength: number): { content: string; truncated: boolean } {
    if (content.length <= maxLength) {
        return { content, truncated: false };
    }

    return {
        content: content.substring(0, maxLength),
        truncated: true,
    };
}
