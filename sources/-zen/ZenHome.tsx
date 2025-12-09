import * as React from 'react';
import { View, ScrollView, Text, TextInput, Platform, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout } from '@/components/layout';
import { ZenHeader } from './components/ZenHeader';
import { TodoList } from './components/TodoList';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { storage } from '@/sync/storage';
import { toggleTodo as toggleTodoSync, reorderTodos as reorderTodosSync, addTodo } from '@/-zen/model/ops';
import { useAuth } from '@/auth/AuthContext';
import { useShallow } from 'zustand/react/shallow';
import { Typography } from '@/constants/Typography';

export const ZenHome = () => {
    const insets = useSafeAreaInsets();
    const { theme } = useUnistyles();
    const auth = useAuth();
    const [showInput, setShowInput] = React.useState(false);
    const [inputText, setInputText] = React.useState('');
    const inputRef = React.useRef<TextInput>(null);

    // Get todos from storage
    const todoState = storage(useShallow(state => state.todoState));
    const todosLoaded = storage(state => state.todosLoaded);

    // Process todos
    const { undoneTodos, doneTodos } = React.useMemo(() => {
        if (!todoState) {
            return { undoneTodos: [], doneTodos: [] };
        }

        const undone = todoState.undoneOrder
            .map(id => todoState.todos[id])
            .filter(Boolean)
            .map(t => ({ id: t.id, title: t.title, done: t.done }));

        const done = todoState.doneOrder
            .map(id => todoState.todos[id])
            .filter(Boolean)
            .map(t => ({ id: t.id, title: t.title, done: t.done }));

        return { undoneTodos: undone, doneTodos: done };
    }, [todoState]);

    // Handle toggle action
    const handleToggle = React.useCallback(async (id: string) => {
        if (auth?.credentials) {
            await toggleTodoSync(auth.credentials, id);
        }
    }, [auth?.credentials]);

    // Handle reorder action
    const handleReorder = React.useCallback(async (id: string, newIndex: number) => {
        if (auth?.credentials) {
            await reorderTodosSync(auth.credentials, id, newIndex, 'undone');
        }
    }, [auth?.credentials]);

    // Handle add button press - toggle inline input
    const handleAddPress = React.useCallback(() => {
        setShowInput(prev => {
            if (prev) {
                // Cancel input
                setInputText('');
                Keyboard.dismiss();
                return false;
            } else {
                // Show input and focus after it appears
                setTimeout(() => inputRef.current?.focus(), 100);
                return true;
            }
        });
    }, []);

    // Handle input submission
    const handleSubmit = React.useCallback(async () => {
        if (inputText.trim() && auth?.credentials) {
            await addTodo(auth.credentials, inputText.trim());
            setInputText('');
            // Keep input visible for adding more items
        }
    }, [inputText, auth?.credentials]);

    // Handle input blur - hide if empty
    const handleBlur = React.useCallback(() => {
        if (!inputText.trim()) {
            setShowInput(false);
            setInputText('');
        }
    }, [inputText]);

    // Add keyboard shortcut for "T" to open new task (Web only)
    React.useEffect(() => {
        if (Platform.OS !== 'web') {
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if no input is focused (to avoid triggering when typing)
            const activeElement = document.activeElement as HTMLElement;
            const isInputFocused = activeElement?.tagName === 'INPUT' ||
                                   activeElement?.tagName === 'TEXTAREA' ||
                                   activeElement?.contentEditable === 'true';

            // Trigger on simple "T" key press when no modifier keys are pressed and no input is focused
            if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && !isInputFocused) {
                e.preventDefault();
                handleAddPress();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleAddPress]);

    return (
        <>
            <ZenHeader onAddPress={handleAddPress} showInput={showInput} />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'center' }}>
                    <View style={{
                        flex: 1,
                        maxWidth: layout.maxWidth,
                        alignSelf: 'stretch',
                        paddingTop: 20,
                    }}>
                        {showInput && (
                            <View style={[
                                styles.inputContainer,
                                { backgroundColor: theme.colors.surfaceHighest }
                            ]}>
                                <TextInput
                                    ref={inputRef}
                                    style={[
                                        styles.input,
                                        { color: theme.colors.text }
                                    ]}
                                    placeholder="What needs to be done?"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={inputText}
                                    onChangeText={setInputText}
                                    onSubmitEditing={handleSubmit}
                                    onBlur={handleBlur}
                                    returnKeyType="done"
                                    blurOnSubmit={false}
                                />
                            </View>
                        )}
                        {undoneTodos.length === 0 && !showInput ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                                    No tasks yet. Tap + to add one.
                                </Text>
                            </View>
                        ) : (
                            <TodoList todos={undoneTodos} onToggleTodo={handleToggle} onReorderTodo={handleReorder} />
                        )}
                    </View>
                </View>
            </ScrollView>
        </>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        marginHorizontal: 8,
        marginBottom: 12,
        borderRadius: 8,
        height: 56,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: 18,
        paddingLeft: 4,
        paddingRight: 4,
        ...Typography.default(),
        ...(Platform.OS === 'web' ? {
            outlineStyle: 'none',
            outlineWidth: 0,
        } as any : {}),
    },
});