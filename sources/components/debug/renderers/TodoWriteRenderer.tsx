import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { BaseRendererProps } from '../types';

interface TodoItem {
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    activeForm: string;
}

/**
 * Specialized renderer for TodoWrite tool output
 * Displays todo list changes as diff
 */
export const TodoWriteRenderer = React.memo<BaseRendererProps>((props) => {
    const { content } = props;
    const { theme } = useUnistyles();

    // Parse TodoWrite tool output
    const todoData = React.useMemo(() => {
        try {
            const parsed = typeof content === 'string' ? JSON.parse(content) : content;

            if (!parsed.todos || !Array.isArray(parsed.todos)) {
                return null;
            }

            return {
                todos: parsed.todos as TodoItem[],
            };
        } catch {
            return null;
        }
    }, [content]);

    // Fallback if not valid TodoWrite input
    if (!todoData) {
        return null; // Let normal renderer handle it
    }

    const statusColors = {
        pending: theme.colors.textSecondary,
        in_progress: theme.colors.warning,
        completed: theme.colors.success,
    };

    const statusIcons = {
        pending: '⏸️',
        in_progress: '▶️',
        completed: '✅',
    };

    return (
        <View>
            {/* Todo header */}
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
                <Text style={{ fontSize: 10 }}>📝</Text>
                <Text
                    style={{
                        fontSize: 9,
                        fontWeight: '600',
                        color: theme.colors.text,
                        textTransform: 'uppercase',
                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                    }}
                >
                    TODO LIST
                </Text>
                <Text
                    style={{
                        fontSize: 8,
                        color: theme.colors.textSecondary,
                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                    }}
                >
                    ({todoData.todos.length} items)
                </Text>
            </View>

            {/* Todo items */}
            <View
                style={{
                    backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 4,
                    padding: 6,
                }}
            >
                {todoData.todos.map((todo, index) => (
                    <View
                        key={index}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            gap: 6,
                            paddingVertical: 2,
                            paddingHorizontal: 4,
                            backgroundColor: todo.status === 'in_progress'
                                ? theme.dark ? 'rgba(255, 235, 59, 0.1)' : 'rgba(255, 235, 59, 0.05)'
                                : 'transparent',
                            borderRadius: 3,
                        }}
                    >
                        <Text style={{ fontSize: 8 }}>{statusIcons[todo.status]}</Text>
                        <Text
                            style={{
                                fontSize: 8,
                                lineHeight: 12,
                                color: statusColors[todo.status],
                                flex: 1,
                                textDecorationLine: todo.status === 'completed' ? 'line-through' : 'none',
                            }}
                            selectable
                        >
                            {todo.content}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Status summary */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Text
                    style={{
                        fontSize: 7,
                        color: theme.colors.textSecondary,
                        fontStyle: 'italic',
                    }}
                >
                    ✅ {todoData.todos.filter(t => t.status === 'completed').length} completed
                </Text>
                <Text
                    style={{
                        fontSize: 7,
                        color: theme.colors.textSecondary,
                        fontStyle: 'italic',
                    }}
                >
                    ▶️ {todoData.todos.filter(t => t.status === 'in_progress').length} in progress
                </Text>
                <Text
                    style={{
                        fontSize: 7,
                        color: theme.colors.textSecondary,
                        fontStyle: 'italic',
                    }}
                >
                    ⏸️ {todoData.todos.filter(t => t.status === 'pending').length} pending
                </Text>
            </View>
        </View>
    );
});

TodoWriteRenderer.displayName = 'TodoWriteRenderer';
