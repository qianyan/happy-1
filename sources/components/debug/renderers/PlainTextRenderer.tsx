import * as React from 'react';
import { Text, Platform, View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';

/**
 * Plain text renderer for debug panel
 * Displays simple text with monospace font
 * Special handling for <system-reminder> tags
 */
export const PlainTextRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Convert content to string - handle objects by stringifying them
    const textContent = React.useMemo(() => {
        if (typeof content === 'string') {
            return content;
        }
        if (typeof content === 'object' && content !== null) {
            try {
                return JSON.stringify(content, null, 2);
            } catch {
                return String(content);
            }
        }
        return String(content);
    }, [content]);

    // Check if content contains system-reminder tags
    const hasSystemReminder = textContent.includes('<system-reminder>');

    if (hasSystemReminder) {
        // Extract system reminder content
        const parts = textContent.split(/(<system-reminder>[\s\S]*?<\/system-reminder>)/);

        return (
            <View>
                {parts.map((part, index) => {
                    if (part.match(/<system-reminder>[\s\S]*?<\/system-reminder>/)) {
                        // Extract content between tags
                        const reminderContent = part
                            .replace(/<system-reminder>/, '')
                            .replace(/<\/system-reminder>/, '')
                            .trim();

                        return (
                            <View
                                key={index}
                                style={{
                                    backgroundColor: theme.dark ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)',
                                    borderLeftWidth: 3,
                                    borderLeftColor: theme.colors.warning,
                                    borderRadius: 4,
                                    paddingHorizontal: 8,
                                    paddingVertical: 6,
                                    marginVertical: 4,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 8,
                                        fontWeight: '700',
                                        color: theme.colors.warning,
                                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        marginBottom: 4,
                                    }}
                                    selectable
                                >
                                    ⚠️ SYSTEM REMINDER
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 9,
                                        lineHeight: 13,
                                        color: theme.colors.text,
                                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                    }}
                                    selectable
                                >
                                    {reminderContent}
                                </Text>
                            </View>
                        );
                    } else if (part.trim().length > 0) {
                        // Regular text
                        return (
                            <Text
                                key={index}
                                style={{
                                    fontSize: 10,
                                    lineHeight: 14,
                                    color: theme.colors.debug.plain,
                                    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                                }}
                                selectable
                            >
                                {part}
                            </Text>
                        );
                    }
                    return null;
                })}
            </View>
        );
    }

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
            {textContent}
        </Text>
    );
});

PlainTextRenderer.displayName = 'PlainTextRenderer';
