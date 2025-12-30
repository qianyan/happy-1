import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

/**
 * Specialized renderer for WebFetch tool input and output
 * - Input: Displays URL and prompt
 * - Output: Displays the fetched content
 */
export const WebFetchRenderer = React.memo<BaseRendererProps>((props) => {
    const { content, type } = props;
    const { theme } = useUnistyles();

    // Parse WebFetch data based on whether it's input or output
    const webData = React.useMemo(() => {
        try {
            // For input, expect {url, prompt}
            if (type === 'input') {
                const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                if (!parsed.url) {
                    return null;
                }
                return {
                    isInput: true,
                    isOutput: false,
                    url: parsed.url,
                    prompt: parsed.prompt,
                };
            }

            // For output, content is just the result string
            if (type === 'output') {
                const result = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
                return {
                    isInput: false,
                    isOutput: true,
                    result,
                };
            }

            return null;
        } catch {
            return null;
        }
    }, [content, type]);

    // Fallback if not valid WebFetch data
    if (!webData) {
        return null; // Let normal renderer handle it
    }

    // Extract domain from URL
    const domain = React.useMemo(() => {
        if (!webData.url) return null;
        try {
            const url = new URL(webData.url);
            return url.hostname;
        } catch {
            return webData.url;
        }
    }, [webData.url]);

    // Render input (URL and prompt)
    if (webData.isInput) {
        return (
            <View>
                {/* URL header */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        backgroundColor: theme.dark ? 'rgba(0, 150, 136, 0.15)' : 'rgba(0, 150, 136, 0.1)',
                        borderRadius: 4,
                        marginBottom: 6,
                    }}
                >
                    <Text style={{ fontSize: 10 }}>🌐</Text>
                    <Text
                        style={{
                            fontSize: 9,
                            fontWeight: '600',
                            color: theme.colors.text,
                            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                            flex: 1,
                        }}
                        numberOfLines={1}
                        selectable
                    >
                        {domain}
                    </Text>
                </View>

                {/* Full URL */}
                <View
                    style={{
                        backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.02)',
                        borderRadius: 4,
                        padding: 6,
                        marginBottom: 6,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 8,
                            lineHeight: 12,
                            color: theme.colors.radio.active,
                            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                        }}
                        selectable
                    >
                        {webData.url}
                    </Text>
                </View>

                {/* Prompt/Query */}
                {webData.prompt && (
                    <View>
                        <Text
                            style={{
                                fontSize: 8,
                                color: theme.colors.textSecondary,
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                marginBottom: 3,
                            }}
                        >
                            Query:
                        </Text>
                        <Text
                            style={{
                                fontSize: 8,
                                color: theme.colors.text,
                                fontStyle: 'italic',
                                marginBottom: 4,
                            }}
                        >
                            {webData.prompt}
                        </Text>
                    </View>
                )}
            </View>
        );
    }

    // Render output (fetched content)
    if (webData.isOutput) {
        return (
            <View>
                {/* Fetched content */}
                {webData.result && (
                    <View
                        style={{
                            backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.01)',
                            borderRadius: 4,
                            padding: 8,
                            borderLeftWidth: 2,
                            borderLeftColor: theme.colors.success,
                        }}
                    >
                        <MarkdownRenderer
                            content={webData.result}
                            compact={false}
                            theme={theme.dark ? 'dark' : 'light'}
                        />
                    </View>
                )}
            </View>
        );
    }

    return null;
});

WebFetchRenderer.displayName = 'WebFetchRenderer';
