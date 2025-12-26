import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';

/**
 * Specialized renderer for Task tool output
 * Displays agent task details with status
 */
export const TaskRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Parse Task tool output
    const taskData = React.useMemo(() => {
        try {
            const parsed = typeof content === 'string' ? JSON.parse(content) : content;

            if (!parsed.description && !parsed.prompt) {
                return null;
            }

            return {
                description: parsed.description,
                prompt: parsed.prompt,
                subagentType: parsed.subagent_type,
            };
        } catch {
            return null;
        }
    }, [content]);

    // Fallback if not valid Task input
    if (!taskData) {
        return null; // Let normal renderer handle it
    }

    const agentIcon = '🤖';
    const agentColor = theme.colors.radio.active;

    return (
        <View>
            {/* Task header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    backgroundColor: theme.dark ? 'rgba(255, 235, 59, 0.15)' : 'rgba(255, 235, 59, 0.1)',
                    borderRadius: 4,
                    marginBottom: 6,
                }}
            >
                <Text style={{ fontSize: 10 }}>{agentIcon}</Text>
                <Text
                    style={{
                        fontSize: 9,
                        fontWeight: '600',
                        color: theme.colors.text,
                        textTransform: 'uppercase',
                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                    }}
                >
                    AGENT TASK
                </Text>
                {taskData.subagentType && (
                    <Text
                        style={{
                            fontSize: 8,
                            color: agentColor,
                            fontWeight: '600',
                            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                        }}
                    >
                        {taskData.subagentType}
                    </Text>
                )}
            </View>

            {/* Description */}
            {taskData.description && (
                <View style={{ marginBottom: 6 }}>
                    <Text
                        style={{
                            fontSize: 8,
                            color: theme.colors.textSecondary,
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            marginBottom: 2,
                        }}
                    >
                        Task:
                    </Text>
                    <Text
                        style={{
                            fontSize: 9,
                            color: theme.colors.text,
                            fontWeight: '600',
                        }}
                    >
                        {taskData.description}
                    </Text>
                </View>
            )}

            {/* Prompt */}
            {taskData.prompt && (
                <View
                    style={{
                        backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.02)',
                        borderRadius: 4,
                        padding: 6,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 8,
                            lineHeight: 12,
                            color: theme.colors.text,
                        }}
                        selectable
                    >
                        {taskData.prompt}
                    </Text>
                </View>
            )}
        </View>
    );
});

TaskRenderer.displayName = 'TaskRenderer';
