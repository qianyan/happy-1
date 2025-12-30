import * as React from 'react';
import { View, ScrollView, Text, TextInput, Platform, Pressable } from 'react-native';
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
import { useWhisperTranscription } from '@/hooks/useWhisperTranscription';
import { RecordingStatusBar } from '@/components/RecordingStatusBar';
import { Ionicons } from '@expo/vector-icons';

export const ZenHome = () => {
    const insets = useSafeAreaInsets();
    const { theme } = useUnistyles();
    const auth = useAuth();
    const [inputText, setInputText] = React.useState('');
    const inputRef = React.useRef<TextInput>(null);

    // Voice dictation
    const handleTranscription = React.useCallback((text: string) => {
        setInputText(prev => prev ? `${prev} ${text}` : text);
    }, []);

    const { status: voiceStatus, startRecording, stopRecording, cancelRecording } = useWhisperTranscription({
        onTranscription: handleTranscription,
    });

    // Toggle voice recording
    const toggleVoice = React.useCallback(async () => {
        if (voiceStatus === 'recording') {
            await stopRecording();
        } else if (voiceStatus === 'idle') {
            await startRecording();
        }
    }, [voiceStatus, startRecording, stopRecording]);

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

    // Handle input submission
    const handleSubmit = React.useCallback(async () => {
        const text = inputText.trim();
        if (text && auth?.credentials) {
            // Clear input immediately for better UX (don't wait for network)
            setInputText('');
            await addTodo(auth.credentials, text);
        }
    }, [inputText, auth?.credentials]);

    // Focus input when pressing T key
    const focusInput = React.useCallback(() => {
        inputRef.current?.focus();
    }, []);

    // Keyboard shortcuts (Web only)
    React.useEffect(() => {
        if (Platform.OS !== 'web') {
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isModifierPressed = isMac ? e.metaKey : e.ctrlKey;

            // Check if no input is focused (to avoid triggering when typing)
            const activeElement = document.activeElement as HTMLElement;
            const isInputFocused = activeElement?.tagName === 'INPUT' ||
                                   activeElement?.tagName === 'TEXTAREA' ||
                                   activeElement?.contentEditable === 'true';

            // ⌘⇧V - Toggle voice dictation
            if (isModifierPressed && e.shiftKey && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                e.stopPropagation();
                toggleVoice();
                return;
            }

            // Escape - Cancel voice recording
            if (e.key === 'Escape' && voiceStatus === 'recording') {
                e.preventDefault();
                cancelRecording();
                return;
            }

            // "T" key - Focus input (when no modifier keys and no input focused)
            if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && !isInputFocused) {
                e.preventDefault();
                focusInput();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [focusInput, toggleVoice, voiceStatus, cancelRecording]);

    return (
        <>
            <ZenHeader />
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
                        {/* Always visible input */}
                        <View>
                            <RecordingStatusBar
                                status={voiceStatus}
                                onCancel={cancelRecording}
                                style={{ marginHorizontal: 8, marginBottom: 8, borderRadius: 8 }}
                            />
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
                                    returnKeyType="done"
                                    blurOnSubmit={false}
                                />
                                {inputText.trim() && (
                                    <Pressable
                                        onPress={handleSubmit}
                                        hitSlop={8}
                                        style={styles.addButton}
                                    >
                                        <Ionicons
                                            name="add-circle"
                                            size={28}
                                            color={theme.colors.textLink}
                                        />
                                    </Pressable>
                                )}
                                <Pressable
                                    onPress={toggleVoice}
                                    hitSlop={8}
                                    style={styles.micButton}
                                >
                                    <Ionicons
                                        name={voiceStatus === 'recording' ? 'stop-circle' : 'mic-outline'}
                                        size={24}
                                        color={voiceStatus === 'recording' ? theme.colors.status.error : theme.colors.textSecondary}
                                    />
                                </Pressable>
                            </View>
                        </View>
                        {undoneTodos.length === 0 ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                                    No tasks yet. Add one above.
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
    micButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
    addButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
});