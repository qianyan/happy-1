import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';

/**
 * Specialized renderer for Bash tool output
 * Displays command and output with clear separation
 */
export const BashRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Parse Bash tool output
    const bashData = React.useMemo(() => {
        try {
            const parsed = typeof content === 'string' ? JSON.parse(content) : content;

            if (!parsed.command) {
                return null;
            }

            return {
                command: parsed.command,
                description: parsed.description,
                timeout: parsed.timeout,
                runInBackground: parsed.run_in_background,
            };
        } catch {
            return null;
        }
    }, [content]);

    // Fallback to existing ANSI/Plain renderer if not valid Bash input
    if (!bashData) {
        return null; // Let the normal renderer handle it
    }

    return (
        <View>
            {/* Command header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    backgroundColor: theme.dark ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)',
                    borderRadius: 4,
                    marginBottom: 6,
                }}
            >
                <Text style={{ fontSize: 10 }}>💻</Text>
                <Text
                    style={{
                        fontSize: 9,
                        fontWeight: '600',
                        color: theme.colors.text,
                        textTransform: 'uppercase',
                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                    }}
                >
                    SHELL
                </Text>
                {bashData.runInBackground && (
                    <Text
                        style={{
                            fontSize: 8,
                            color: theme.colors.warning,
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                        }}
                    >
                        BACKGROUND
                    </Text>
                )}
                {bashData.timeout && (
                    <Text
                        style={{
                            fontSize: 8,
                            color: theme.colors.textSecondary,
                            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                        }}
                    >
                        {bashData.timeout}ms
                    </Text>
                )}
            </View>

            {/* Description if available */}
            {bashData.description && (
                <Text
                    style={{
                        fontSize: 8,
                        color: theme.colors.textSecondary,
                        marginBottom: 4,
                        fontStyle: 'italic',
                    }}
                >
                    {bashData.description}
                </Text>
            )}

            {/* Command */}
            <View
                style={{
                    backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.03)',
                    borderRadius: 4,
                    padding: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: '#FF9800',
                }}
            >
                <Text
                    style={{
                        fontSize: 9,
                        lineHeight: 13,
                        color: '#FF9800',
                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                        fontWeight: '600',
                    }}
                    selectable
                >
                    $ {bashData.command}
                </Text>
            </View>
        </View>
    );
});

BashRenderer.displayName = 'BashRenderer';
