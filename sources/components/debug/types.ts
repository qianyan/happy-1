/**
 * Content types that can be rendered in the debug panel
 */
export type ContentType =
    | 'json-object'    // Already parsed JSON object
    | 'json-string'    // JSON as string (needs parsing)
    | 'ansi-text'      // Text with ANSI escape codes
    | 'plain-text'     // Simple text
    | 'markdown'       // Markdown formatted text
    | 'table'          // Table (markdown table, array of objects, or array of arrays)
    | 'error'          // Error messages with stack traces
    | 'edit'           // Edit tool output (file diffs)
    | 'write'          // Write tool output (file creation)
    | 'multi-edit'     // MultiEdit tool output (multiple file diffs)
    | 'notebook-edit'  // NotebookEdit tool output (Jupyter cell edits)
    | 'read'           // Read tool output (file content)
    | 'grep'           // Grep tool output (search results)
    | 'glob'           // Glob tool output (file listings)
    | 'bash'           // Bash tool output (shell commands)
    | 'web-fetch'      // WebFetch tool output (URL fetching)
    | 'web-search'     // WebSearch tool output (search queries)
    | 'task'           // Task tool output (agent tasks)
    | 'todo-write'     // TodoWrite tool output (todo lists)
    | 'number'         // Primitive number
    | 'boolean'        // Primitive boolean
    | 'null'           // Null/undefined
    | 'array'          // Array (will be rendered as JSON)
    | 'unknown';       // Unknown format

/**
 * Base props for all renderers
 */
export interface BaseRendererProps {
    content: any;
    type?: 'input' | 'output';
    compact?: boolean;
    maxLength?: number;
    theme: 'light' | 'dark';
}

/**
 * Props for DebugContentRenderer
 */
export interface DebugContentRendererProps {
    content: any;
    type?: 'input' | 'output';
    toolName?: string;
    compact?: boolean;
    maxLength?: number;
    forceRenderer?: ContentType;
}

/**
 * JSON token type for syntax highlighting
 */
export interface JsonToken {
    type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'bracket' | 'punctuation' | 'whitespace';
    value: string;
    nestLevel?: number;
}

/**
 * ANSI parsed segment for rendering
 */
export interface AnsiSegment {
    text: string;
    color?: string;
    backgroundColor?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}
