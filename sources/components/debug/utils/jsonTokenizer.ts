import { JsonToken } from '../types';

/**
 * Tokenizes JSON string for syntax highlighting
 * Optimized for debug panel display - lightweight and fast
 */
export function tokenizeJson(jsonString: string): JsonToken[] {
    const tokens: JsonToken[] = [];
    let i = 0;
    const len = jsonString.length;

    // Track bracket depth for nesting visualization
    let bracketDepth = 0;
    const bracketStack: string[] = [];

    while (i < len) {
        const char = jsonString[i];

        // Whitespace (preserve it)
        if (/\s/.test(char)) {
            let whitespace = '';
            while (i < len && /\s/.test(jsonString[i])) {
                whitespace += jsonString[i];
                i++;
            }
            tokens.push({ type: 'whitespace', value: whitespace });
            continue;
        }

        // String (including keys)
        if (char === '"') {
            let stringValue = '"';
            i++;
            let escaped = false;

            while (i < len) {
                const c = jsonString[i];
                stringValue += c;

                if (escaped) {
                    escaped = false;
                } else if (c === '\\') {
                    escaped = true;
                } else if (c === '"') {
                    i++;
                    break;
                }
                i++;
            }

            // Check if this is a key (followed by colon)
            let isKey = false;
            let j = i;
            while (j < len && /\s/.test(jsonString[j])) j++;
            if (jsonString[j] === ':') {
                isKey = true;
            }

            tokens.push({
                type: isKey ? 'key' : 'string',
                value: stringValue,
            });
            continue;
        }

        // Numbers
        if (/[-0-9]/.test(char)) {
            let number = '';
            while (i < len && /[-0-9.eE+]/.test(jsonString[i])) {
                number += jsonString[i];
                i++;
            }
            tokens.push({ type: 'number', value: number });
            continue;
        }

        // Booleans
        if (jsonString.substring(i, i + 4) === 'true') {
            tokens.push({ type: 'boolean', value: 'true' });
            i += 4;
            continue;
        }
        if (jsonString.substring(i, i + 5) === 'false') {
            tokens.push({ type: 'boolean', value: 'false' });
            i += 5;
            continue;
        }

        // Null
        if (jsonString.substring(i, i + 4) === 'null') {
            tokens.push({ type: 'null', value: 'null' });
            i += 4;
            continue;
        }

        // Brackets
        if (char === '{' || char === '[') {
            bracketStack.push(char);
            bracketDepth++;
            tokens.push({
                type: 'bracket',
                value: char,
                nestLevel: bracketDepth,
            });
            i++;
            continue;
        }

        if (char === '}' || char === ']') {
            bracketStack.pop();
            tokens.push({
                type: 'bracket',
                value: char,
                nestLevel: bracketDepth,
            });
            bracketDepth = Math.max(0, bracketDepth - 1);
            i++;
            continue;
        }

        // Punctuation (colon, comma)
        if (char === ':' || char === ',') {
            tokens.push({ type: 'punctuation', value: char });
            i++;
            continue;
        }

        // Unknown character - skip it
        i++;
    }

    return tokens;
}

/**
 * Pretty-print JSON with proper indentation
 */
export function prettifyJson(json: any): string {
    try {
        return JSON.stringify(json, null, 2);
    } catch (error) {
        return String(json);
    }
}

/**
 * Minify JSON to compact form
 */
export function minifyJson(json: any): string {
    try {
        return JSON.stringify(json);
    } catch (error) {
        return String(json);
    }
}
