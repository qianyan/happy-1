import * as React from 'react';
import { Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';
import { parseAnsi } from '../utils';

/**
 * ANSI renderer for debug panel
 * Parses ANSI escape codes and renders colored text (for shell output)
 */
export const AnsiRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Convert content to string
    const textContent = typeof content === 'string' ? content : String(content);

    // Parse ANSI codes
    const segments = React.useMemo(() => {
        return parseAnsi(textContent);
    }, [textContent]);

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
            {segments.map((segment, index) => (
                <Text
                    key={index}
                    style={{
                        color: segment.color || theme.colors.debug.plain,
                        backgroundColor: segment.backgroundColor,
                        fontWeight: segment.bold ? 'bold' : 'normal',
                        fontStyle: segment.italic ? 'italic' : 'normal',
                        textDecorationLine: segment.underline ? 'underline' : 'none',
                    }}
                >
                    {segment.text}
                </Text>
            ))}
        </Text>
    );
});

AnsiRenderer.displayName = 'AnsiRenderer';
