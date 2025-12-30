import * as React from 'react';
import { Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';

/**
 * Error renderer for debug panel
 * Formats error messages with stack traces
 */
export const ErrorRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Convert content to string
    const errorText = typeof content === 'string' ? content : String(content);

    // Parse error message
    const { errorType, errorMessage, stackTrace } = React.useMemo(() => {
        const lines = errorText.split('\n');

        // First line usually contains error type and message
        const firstLine = lines[0] || '';

        // Extract error type (e.g., "Error:", "TypeError:", "ReferenceError:")
        const typeMatch = firstLine.match(/^(\w+Error):\s*/);
        const type = typeMatch ? typeMatch[1] : 'Error';
        const message = typeMatch ? firstLine.substring(typeMatch[0].length) : firstLine;

        // Remaining lines are stack trace
        const stack = lines.slice(1).join('\n');

        return {
            errorType: type,
            errorMessage: message,
            stackTrace: stack,
        };
    }, [errorText]);

    return (
        <Text
            style={{
                fontSize: 10,
                lineHeight: 14,
                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
            }}
            selectable
        >
            {/* Error type in red */}
            <Text style={{ color: theme.colors.debug.error.type, fontWeight: '600' }}>
                {errorType}:
            </Text>
            {' '}
            {/* Error message */}
            <Text style={{ color: theme.colors.debug.error.message }}>
                {errorMessage}
            </Text>
            {'\n'}
            {/* Stack trace in gray */}
            {stackTrace && (
                <Text style={{ color: theme.colors.debug.error.stack }}>
                    {stackTrace}
                </Text>
            )}
        </Text>
    );
});

ErrorRenderer.displayName = 'ErrorRenderer';
