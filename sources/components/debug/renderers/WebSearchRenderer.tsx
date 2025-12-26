import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';

/**
 * Specialized renderer for WebSearch tool output
 * Displays search query with result metadata
 */
export const WebSearchRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Parse WebSearch tool output
    const searchData = React.useMemo(() => {
        try {
            const parsed = typeof content === 'string' ? JSON.parse(content) : content;

            if (!parsed.query) {
                return null;
            }

            return {
                query: parsed.query,
                allowedDomains: parsed.allowed_domains,
                blockedDomains: parsed.blocked_domains,
            };
        } catch {
            return null;
        }
    }, [content]);

    // Fallback if not valid WebSearch input
    if (!searchData) {
        return null; // Let normal renderer handle it
    }

    return (
        <View>
            {/* Search header */}
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
                <Text style={{ fontSize: 10 }}>🔍</Text>
                <Text
                    style={{
                        fontSize: 9,
                        fontWeight: '600',
                        color: theme.colors.text,
                        textTransform: 'uppercase',
                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                    }}
                >
                    WEB SEARCH
                </Text>
            </View>

            {/* Query */}
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
                        fontSize: 9,
                        lineHeight: 13,
                        color: theme.colors.text,
                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                    }}
                    selectable
                >
                    "{searchData.query}"
                </Text>
            </View>

            {/* Domain filters */}
            {(searchData.allowedDomains || searchData.blockedDomains) && (
                <View style={{ gap: 4 }}>
                    {searchData.allowedDomains && searchData.allowedDomains.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                            <Text
                                style={{
                                    fontSize: 7,
                                    color: theme.colors.success,
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                }}
                            >
                                ALLOW:
                            </Text>
                            <Text
                                style={{
                                    fontSize: 7,
                                    color: theme.colors.textSecondary,
                                    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                }}
                            >
                                {searchData.allowedDomains.join(', ')}
                            </Text>
                        </View>
                    )}
                    {searchData.blockedDomains && searchData.blockedDomains.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                            <Text
                                style={{
                                    fontSize: 7,
                                    color: '#FF5555',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                }}
                            >
                                BLOCK:
                            </Text>
                            <Text
                                style={{
                                    fontSize: 7,
                                    color: theme.colors.textSecondary,
                                    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                }}
                            >
                                {searchData.blockedDomains.join(', ')}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
});

WebSearchRenderer.displayName = 'WebSearchRenderer';
