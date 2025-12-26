import * as React from 'react';
import { Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';
import { tokenizeJson, prettifyJson } from '../utils';

/**
 * JSON renderer with syntax highlighting for debug panel
 * Displays JSON with color-coded keys, values, and structure
 */
export const JsonRenderer = React.memo<BaseRendererProps>((props) => {
    const { content, compact } = props;
    const { theme } = useUnistyles();

    // Convert to JSON string if needed
    const jsonString = React.useMemo(() => {
        if (typeof content === 'string') {
            // Try to parse and re-stringify for pretty formatting
            try {
                const parsed = JSON.parse(content);
                return compact ? JSON.stringify(parsed) : prettifyJson(parsed);
            } catch {
                return content;
            }
        } else {
            return compact ? JSON.stringify(content) : prettifyJson(content);
        }
    }, [content, compact]);

    // Tokenize JSON
    const tokens = React.useMemo(() => {
        return tokenizeJson(jsonString);
    }, [jsonString]);

    // Get color for token type
    const getTokenColor = (type: string): string => {
        const colors = theme.colors.debug.json;
        switch (type) {
            case 'key':
                return colors.key;
            case 'string':
                return colors.string;
            case 'number':
                return colors.number;
            case 'boolean':
                return colors.boolean;
            case 'null':
                return colors.null;
            case 'bracket':
                return colors.bracket;
            case 'punctuation':
                return colors.punctuation;
            case 'whitespace':
                return theme.colors.text; // Use default text color for whitespace
            default:
                return theme.colors.debug.plain;
        }
    };

    return (
        <Text
            style={{
                fontSize: 10,
                lineHeight: 14,
                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
            }}
            selectable
        >
            {tokens.map((token, index) => (
                <Text
                    key={index}
                    style={{
                        color: getTokenColor(token.type),
                        fontWeight: token.type === 'key' ? '600' : '400',
                    }}
                >
                    {token.value}
                </Text>
            ))}
        </Text>
    );
});

JsonRenderer.displayName = 'JsonRenderer';
