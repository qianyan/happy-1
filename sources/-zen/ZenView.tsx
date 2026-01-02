import * as React from 'react';
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '@/constants/Typography';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '@/sync/storage';
import { toggleTodo, updateTodoTitle, updateTodoText, deleteTodo } from '@/-zen/model/ops';
import { useAuth } from '@/auth/AuthContext';
import { useShallow } from 'zustand/react/shallow';
import { clarifyPrompt } from '@/-zen/model/prompts';
import { storeTempData, type NewSessionData } from '@/utils/tempDataStore';
import { toCamelCase } from '@/utils/stringUtils';
import { removeTaskLinks, getSessionsForTask } from '@/-zen/model/taskSessionLink';
import { MarkdownView } from '@/components/markdown/MarkdownView';
import { layout } from '@/components/layout';
import { useWhisperTranscription } from '@/hooks/useWhisperTranscription';
import { RecordingStatusBar } from '@/components/RecordingStatusBar';

export const ZenView = React.memo(() => {
    const router = useRouter();
    const { theme } = useUnistyles();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const auth = useAuth();
    const { width } = useWindowDimensions();
    const isSmallScreen = width < 500;

    const todoId = params.id as string;

    // Get todo from storage
    const todo = storage(useShallow(state => {
        const todoState = state.todoState;
        if (!todoState) return null;
        const todoItem = todoState.todos[todoId];
        if (!todoItem) return null;
        return {
            id: todoItem.id,
            title: todoItem.title,
            text: todoItem.text,
            done: todoItem.done
        };
    }));

    const [isEditingTitle, setIsEditingTitle] = React.useState(false);
    const [isEditingText, setIsEditingText] = React.useState(false);
    const [editedTitle, setEditedTitle] = React.useState(todo?.title || '');
    const [editedText, setEditedText] = React.useState(todo?.text || '');
    const textInputRef = React.useRef<TextInput>(null);

    // Voice dictation - appends transcribed text to the text field
    const handleTranscription = React.useCallback((text: string) => {
        setEditedText(prev => prev ? `${prev} ${text}` : text);
        // Auto-start editing text if not already
        if (!isEditingText) {
            setIsEditingText(true);
        }
    }, [isEditingText]);

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

    // Get linked sessions for this task
    const linkedSessions = React.useMemo(() => {
        return getSessionsForTask(todoId);
    }, [todoId]);

    // Update local state when todo changes
    React.useEffect(() => {
        if (todo) {
            setEditedTitle(todo.title);
            setEditedText(todo.text || '');
        }
    }, [todo]);

    // Keyboard shortcuts (Web only)
    React.useEffect(() => {
        if (Platform.OS !== 'web') {
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isModifierPressed = isMac ? e.metaKey : e.ctrlKey;

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
        };

        const handleKeyPress = (event: KeyboardEvent) => {
            // Navigate to new todo when any key is pressed (except when editing)
            if (!isEditingTitle && !isEditingText && event.key && event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
                router.dismissAll();
                router.push('/zen/new');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keypress', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keypress', handleKeyPress);
        };
    }, [isEditingTitle, isEditingText, router, toggleVoice, voiceStatus, cancelRecording]);

    if (!todo) {
        // Todo was deleted or doesn't exist
        return null;
    }

    const handleSaveTitle = async () => {
        if (editedTitle.trim() && editedTitle !== todo.title && auth?.credentials) {
            await updateTodoTitle(auth.credentials, todoId, editedTitle.trim());
        }
        setIsEditingTitle(false);
    };

    const handleSaveText = async () => {
        if (editedText !== (todo.text || '') && auth?.credentials) {
            await updateTodoText(auth.credentials, todoId, editedText);
        }
        setIsEditingText(false);
    };

    const handleStartEditingText = () => {
        setIsEditingText(true);
        // Focus the input after state updates
        setTimeout(() => textInputRef.current?.focus(), 50);
    };

    const handleToggleDone = async () => {
        if (auth?.credentials) {
            await toggleTodo(auth.credentials, todoId);
        }
    };

    const handleDelete = async () => {
        if (auth?.credentials) {
            // Remove any linked sessions
            removeTaskLinks(todoId);
            await deleteTodo(auth.credentials, todoId);
            router.back();
        }
    };

    const handleClarifyWithAI = () => {
        // Generate the task file name from the task title
        const taskFileName = toCamelCase(editedTitle) || 'untitledTask';
        const taskFile = `.dev/tasks/${taskFileName}.md`;

        // Build the task description including text if available
        const taskDescription = editedText.trim()
            ? `${editedTitle}\n\nDetails:\n${editedText}`
            : editedTitle;

        // Format the prompt using the full clarifyPrompt template
        const promptText = clarifyPrompt
            .replace('{{taskFile}}', taskFile)
            .replace('{{task}}', taskDescription);

        // Store the prompt data in temporary store
        const sessionData: NewSessionData = {
            prompt: promptText,
            agentType: 'claude', // Default to Claude for clarification tasks
            taskId: todoId,
            taskTitle: editedTitle,
            taskText: editedText
        };
        const dataId = storeTempData(sessionData);

        // Navigate to new session screen with the data ID
        router.push({
            pathname: '/new',
            params: { dataId }
        });
    };

    const handleWorkOnTask = () => {
        // Build the prompt including text details if available
        const promptText = editedText.trim()
            ? `Work on this task: ${editedTitle}\n\nDetails:\n${editedText}`
            : `Work on this task: ${editedTitle}`;

        // Store the prompt data in temporary store
        const sessionData: NewSessionData = {
            prompt: promptText,
            agentType: 'claude', // Default to Claude
            taskId: todoId,
            taskTitle: editedTitle,
            taskText: editedText
        };
        const dataId = storeTempData(sessionData);

        // Navigate to new session screen with the data ID
        router.push({
            pathname: '/new',
            params: { dataId }
        });
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'center' }}>
                    <View style={[
                        styles.content,
                        { paddingBottom: insets.bottom + 20, maxWidth: layout.maxWidth, flex: 1 }
                    ]}>
                    {/* Checkbox and Title */}
                    <View style={styles.mainSection}>
                        <Pressable
                            onPress={handleToggleDone}
                            style={[
                                styles.checkbox,
                                {
                                    borderColor: todo.done ? theme.colors.success : theme.colors.textSecondary,
                                    backgroundColor: todo.done ? theme.colors.success : 'transparent',
                                }
                            ]}
                        >
                            {todo.done && (
                                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                            )}
                        </Pressable>

                        <View style={{ flex: 1 }}>
                            {isEditingTitle ? (
                                <TextInput
                                    style={[
                                        styles.titleInput,
                                        { color: theme.colors.text }
                                    ]}
                                    value={editedTitle}
                                    onChangeText={setEditedTitle}
                                    onBlur={handleSaveTitle}
                                    onSubmitEditing={handleSaveTitle}
                                    autoFocus
                                    multiline
                                    blurOnSubmit={true}
                                />
                            ) : (
                                <Pressable onPress={() => setIsEditingTitle(true)}>
                                    <Text style={[
                                        styles.taskText,
                                        {
                                            color: todo.done ? theme.colors.textSecondary : theme.colors.text,
                                            textDecorationLine: todo.done ? 'line-through' : 'none',
                                            opacity: todo.done ? 0.6 : 1,
                                        }
                                    ]}>
                                        {editedTitle}
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </View>

                    {/* Recording Status Bar */}
                    <RecordingStatusBar
                        status={voiceStatus}
                        onCancel={cancelRecording}
                        style={{ marginBottom: 12, borderRadius: 8 }}
                    />

                    {/* Task Details/Notes - Full height section */}
                    <View style={styles.textSection}>
                        {isEditingText ? (
                            <View style={{ flex: 1 }}>
                                <View style={styles.textInputRow}>
                                    <TextInput
                                        ref={textInputRef}
                                        style={[
                                            styles.textInput,
                                            { color: theme.colors.text }
                                        ]}
                                        value={editedText}
                                        onChangeText={setEditedText}
                                        onBlur={handleSaveText}
                                        placeholder="Add details..."
                                        placeholderTextColor={theme.colors.textSecondary}
                                        multiline
                                        textAlignVertical="top"
                                        autoFocus
                                    />
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
                                {Platform.OS !== 'web' && (
                                    <Pressable
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            handleSaveText();
                                        }}
                                        style={[styles.doneButton, { backgroundColor: theme.colors.button.primary.background }]}
                                    >
                                        <Text style={styles.doneButtonText}>Done</Text>
                                    </Pressable>
                                )}
                            </View>
                        ) : (
                            <View style={styles.textDisplayRow}>
                                <Pressable onPress={handleStartEditingText} style={styles.textDisplay}>
                                    {editedText.trim() ? (
                                        <MarkdownView markdown={editedText} />
                                    ) : (
                                        <Text style={[styles.textPlaceholder, { color: theme.colors.textSecondary }]}>
                                            Tap here to add details...
                                        </Text>
                                    )}
                                </Pressable>
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
                        )}
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Pressable
                            onPress={handleWorkOnTask}
                            style={[styles.actionButton, { backgroundColor: theme.colors.button.primary.background }]}
                        >
                            <Ionicons name="hammer-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Work on task</Text>
                        </Pressable>

                        <Pressable
                            onPress={handleClarifyWithAI}
                            style={[styles.actionButton, { backgroundColor: theme.colors.surfaceHighest }]}
                        >
                            <Ionicons name="sparkles" size={20} color={theme.colors.text} />
                            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Clarify</Text>
                        </Pressable>

                        <Pressable
                            onPress={handleDelete}
                            style={[
                                styles.actionButton,
                                { backgroundColor: theme.colors.textDestructive },
                                isSmallScreen && styles.iconOnlyButton
                            ]}
                        >
                            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                            {!isSmallScreen && <Text style={styles.actionButtonText}>Delete</Text>}
                        </Pressable>
                    </View>

                    {/* Linked Sessions */}
                    {linkedSessions.length > 0 && (
                        <View style={styles.linkedSessionsSection}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                Linked Sessions
                            </Text>
                            {linkedSessions.map((link, index) => (
                                <Pressable
                                    key={link.sessionId}
                                    onPress={() => { router.dismissAll(); router.push(`/session/${link.sessionId}`); }}
                                    style={[styles.linkedSession, { backgroundColor: theme.colors.surfaceHighest }]}
                                >
                                    <Ionicons name="chatbubble-outline" size={16} color={theme.colors.textSecondary} />
                                    <Text style={[styles.linkedSessionText, { color: theme.colors.text }]}>
                                        {link.title}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                                </Pressable>
                            ))}
                        </View>
                    )}
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    mainSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    taskText: {
        fontSize: 20,
        lineHeight: 28,
        ...Typography.default(),
    },
    titleInput: {
        fontSize: 20,
        lineHeight: 28,
        padding: 0,
        ...Typography.default(),
        ...(Platform.OS === 'web' ? {
            outlineStyle: 'none',
            outlineWidth: 0,
        } as any : {}),
    },
    textSection: {
        flex: 1,
        marginBottom: 24,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        lineHeight: 24,
        padding: 0,
        minHeight: 120,
        ...Typography.default(),
        ...(Platform.OS === 'web' ? {
            outlineStyle: 'none',
            outlineWidth: 0,
        } as any : {}),
    },
    textInputRow: {
        flexDirection: 'row',
        flex: 1,
    },
    textDisplayRow: {
        flexDirection: 'row',
        flex: 1,
    },
    textDisplay: {
        flex: 1,
        minHeight: 120,
    },
    textPlaceholder: {
        fontSize: 16,
        lineHeight: 24,
        ...Typography.default(),
    },
    micButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    actions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 24,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        ...Typography.default(),
    },
    iconOnlyButton: {
        paddingHorizontal: 12,
    },
    doneButton: {
        alignSelf: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 12,
    },
    doneButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        ...Typography.default(),
    },
    linkedSessionsSection: {
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        ...Typography.default('semiBold'),
    },
    linkedSession: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 8,
        gap: 8,
    },
    linkedSessionText: {
        flex: 1,
        fontSize: 14,
        ...Typography.default(),
    },
}));