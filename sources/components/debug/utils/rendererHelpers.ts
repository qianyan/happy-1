/**
 * Shared utility functions for debug renderers
 */

/**
 * Unescape string literals (convert \n to actual newlines, etc.)
 */
export function unescapeString(str: string): string {
    return str
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
}

/**
 * Get file icon emoji based on file extension
 */
export function getFileIcon(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();

    switch (ext) {
        // Code files
        case 'ts':
        case 'tsx':
        case 'js':
        case 'jsx':
            return '📜';
        case 'py':
            return '🐍';
        case 'java':
        case 'kt':
            return '☕';
        case 'go':
            return '🔷';
        case 'rs':
            return '🦀';
        case 'c':
        case 'cpp':
        case 'h':
        case 'hpp':
            return '⚙️';

        // Web files
        case 'html':
        case 'htm':
            return '🌐';
        case 'css':
        case 'scss':
        case 'sass':
        case 'less':
            return '🎨';

        // Data files
        case 'json':
            return '📋';
        case 'xml':
            return '📰';
        case 'yaml':
        case 'yml':
            return '⚙️';
        case 'toml':
            return '📝';
        case 'csv':
            return '📊';

        // Document files
        case 'md':
        case 'markdown':
            return '📖';
        case 'txt':
            return '📄';
        case 'pdf':
            return '📕';

        // Media files
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
        case 'webp':
            return '🖼️';
        case 'mp4':
        case 'mov':
        case 'avi':
            return '🎬';
        case 'mp3':
        case 'wav':
        case 'ogg':
            return '🎵';

        // Config files
        case 'env':
            return '🔐';
        case 'gitignore':
        case 'dockerignore':
            return '🚫';
        case 'dockerfile':
            return '🐳';

        // Notebook
        case 'ipynb':
            return '📓';

        // Default
        default:
            return '📄';
    }
}

/**
 * Extract filename from full path
 */
export function extractFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
}

/**
 * Get syntax highlighting color for code based on simple patterns
 * (Lightweight alternative to full syntax highlighting library)
 */
export function getCodeHighlightColor(line: string, theme: any): string {
    const trimmed = line.trim();

    // Comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
        return theme.colors.textSecondary;
    }

    // Keywords (simple detection)
    if (/^(import|export|const|let|var|function|class|interface|type|enum|return|if|else|for|while)\s/.test(trimmed)) {
        return theme.colors.radio.active;
    }

    // Strings
    if (trimmed.startsWith('"') || trimmed.startsWith("'") || trimmed.startsWith('`')) {
        return theme.colors.success;
    }

    // Default
    return theme.colors.text;
}
