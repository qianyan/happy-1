import { AgentContentView } from '@/components/AgentContentView';
import { AgentInput } from '@/components/AgentInput';
import { MultiTextInputHandle } from '@/components/MultiTextInput';
import { ModelMode } from '@/components/PermissionModeSelector';
import { getSuggestions } from '@/components/autocomplete/suggestions';
import { ChatHeaderView } from '@/components/ChatHeaderView';
import { ChatList } from '@/components/ChatList';
import { Deferred } from '@/components/Deferred';
import { EmptyMessages } from '@/components/EmptyMessages';
import { DebugTranscriptPanel } from '@/components/DebugTranscriptPanel';
import { hapticsHeavy } from '@/components/haptics';
import { useDraft } from '@/hooks/useDraft';
import { useImageAttachments } from '@/hooks/useImageAttachments';
import { Modal } from '@/modal';
import { useWhisperTranscription, TranscriptionStatus } from '@/hooks/useWhisperTranscription';
import { gitStatusSync } from '@/sync/gitStatusSync';
import { sessionAbort, sessionSwitch } from '@/sync/ops';
import { storage, useIsDataReady, useLocalSetting, useSessionMessages, useSessionUsage, useSetting } from '@/sync/storage';
import { useSession } from '@/sync/storage';
import { Session } from '@/sync/storageTypes';
import { sync } from '@/sync/sync';
import { t } from '@/text';
import { tracking, trackMessageSent } from '@/track';
import { isRunningOnMac } from '@/utils/platform';
import { useDeviceType, useHeaderHeight, useIsLandscape, useIsTablet } from '@/utils/responsive';
import { formatPathRelativeToHome, getSessionAvatarId, getSessionName, useSessionStatus } from '@/utils/sessionUtils';
import { isVersionSupported, MINIMUM_CLI_VERSION } from '@/utils/versionUtils';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useMemo } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';

export const SessionView = React.memo((props: { id: string }) => {
    const sessionId = props.id;
    const router = useRouter();
    const session = useSession(sessionId);
    const isDataReady = useIsDataReady();
    const { theme, rt } = useUnistyles();
    const safeArea = useSafeAreaInsets();
    const isLandscape = useIsLandscape();
    const deviceType = useDeviceType();
    const headerHeight = useHeaderHeight();
    const [showDebugPanel, setShowDebugPanel] = React.useState(false);
    const isDesktop = rt.breakpoint === 'lg' || rt.breakpoint === 'xl';

    // Compute header props based on session state
    const headerProps = useMemo(() => {
        if (!isDataReady) {
            // Loading state - show empty header
            return {
                title: '',
                subtitle: undefined,
                avatarId: undefined,
                onAvatarPress: undefined,
                isConnected: false,
                flavor: null
            };
        }

        if (!session) {
            // Deleted state - show deleted message in header
            return {
                title: t('errors.sessionDeleted'),
                subtitle: undefined,
                avatarId: undefined,
                onAvatarPress: undefined,
                isConnected: false,
                flavor: null
            };
        }

        // Normal state - show session info
        const isConnected = session.presence === 'online';
        return {
            title: getSessionName(session),
            subtitle: session.metadata?.path ? formatPathRelativeToHome(session.metadata.path, session.metadata?.homeDir) : undefined,
            avatarId: getSessionAvatarId(session),
            onAvatarPress: () => router.push(`/session/${sessionId}/info`),
            isConnected: isConnected,
            flavor: session.metadata?.flavor || null,
            tintColor: isConnected ? '#000' : '#8E8E93'
        };
    }, [session, isDataReady, sessionId, router]);

    // Handle debug button press - toggle on desktop, navigate on mobile
    const handleDebugPress = React.useCallback(() => {
        if (isDesktop) {
            setShowDebugPanel(prev => !prev);
        } else {
            router.push(`/session/${sessionId}/debug`);
        }
    }, [isDesktop, router, sessionId]);

    return (
        <>
            {/* Status bar shadow for landscape mode */}
            {isLandscape && deviceType === 'phone' && (
                <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: safeArea.top,
                    backgroundColor: theme.colors.surface,
                    zIndex: 1000,
                    shadowColor: theme.colors.shadow.color,
                    shadowOffset: {
                        width: 0,
                        height: 2,
                    },
                    shadowOpacity: theme.colors.shadow.opacity,
                    shadowRadius: 3,
                    elevation: 5,
                }} />
            )}

            {/* Header - always shown, hidden in landscape mode on phone */}
            {!(isLandscape && deviceType === 'phone') && (
                <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1000
                }}>
                    <ChatHeaderView
                        {...headerProps}
                        onBackPress={() => router.back()}
                        onDebugPress={session ? handleDebugPress : undefined}
                        isDebugActive={showDebugPanel}
                    />
                </View>
            )}

            {/* Content based on state */}
            <View style={{ flex: 1, paddingTop: !(isLandscape && deviceType === 'phone') ? safeArea.top + headerHeight : 0 }}>
                {!isDataReady ? (
                    // Loading state
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                    </View>
                ) : !session ? (
                    // Deleted state
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="trash-outline" size={48} color={theme.colors.textSecondary} />
                        <Text style={{ color: theme.colors.text, fontSize: 20, marginTop: 16, fontWeight: '600' }}>{t('errors.sessionDeleted')}</Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 15, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>{t('errors.sessionDeletedDescription')}</Text>
                    </View>
                ) : (
                    // Normal session view
                    <SessionViewLoaded key={sessionId} sessionId={sessionId} session={session} showDebugPanel={showDebugPanel} />
                )}
            </View>
        </>
    );
});


function SessionViewLoaded({ sessionId, session, showDebugPanel }: { sessionId: string, session: Session, showDebugPanel: boolean }) {
    const { theme, rt } = useUnistyles();
    const router = useRouter();
    const safeArea = useSafeAreaInsets();
    const isLandscape = useIsLandscape();
    const deviceType = useDeviceType();
    const isTablet = useIsTablet();
    const headerHeight = useHeaderHeight();
    const [message, setMessage] = React.useState('');
    const { messages, isLoaded } = useSessionMessages(sessionId);
    const acknowledgedCliVersions = useLocalSetting('acknowledgedCliVersions');
    const [selectedMessageId, setSelectedMessageId] = React.useState<string | null>(null);
    const isDesktop = rt.breakpoint === 'lg' || rt.breakpoint === 'xl';
    // Show split view only when on desktop AND debug panel is toggled on
    const isDesktopSplitView = isDesktop && showDebugPanel;

    // Mark session as read when viewing it (synced across devices)
    // Only sync if there's actually a new message to mark as read (saves bandwidth)
    React.useEffect(() => {
        const currentSettings = storage.getState().settings;
        const lastReadAt = currentSettings.sessionLastReadAt[sessionId] ?? 0;
        const lastMessageAt = session.lastMessageAt ?? 0;

        // Only update if there's a new message we haven't read yet
        if (lastMessageAt > lastReadAt) {
            sync.applySettings({
                sessionLastReadAt: {
                    ...currentSettings.sessionLastReadAt,
                    [sessionId]: Date.now()
                }
            });
        }
    }, [sessionId, session.lastMessageAt]);

    // Check if CLI version is outdated and not already acknowledged
    const cliVersion = session.metadata?.version;
    const machineId = session.metadata?.machineId;
    const isCliOutdated = cliVersion && !isVersionSupported(cliVersion, MINIMUM_CLI_VERSION);
    const isAcknowledged = machineId && acknowledgedCliVersions[machineId] === cliVersion;
    const shouldShowCliWarning = isCliOutdated && !isAcknowledged;
    // Get permission mode from session object, default to YOLO mode
    // (bypassPermissions for Claude, yolo for Codex)
    const isCodex = session.metadata?.flavor === 'codex';
    const defaultPermissionMode = isCodex ? 'yolo' : 'bypassPermissions';
    const permissionMode = session.permissionMode || defaultPermissionMode;
    // Get model mode from session object, default to 'default'
    const modelMode = session.modelMode || 'default';
    const sessionStatus = useSessionStatus(session);
    const sessionUsage = useSessionUsage(sessionId);
    const alwaysShowContextSize = useSetting('alwaysShowContextSize');

    // Use draft hook for auto-saving message drafts
    const { clearDraft } = useDraft(sessionId, message, setMessage);

    // Image attachments state
    const {
        attachments: imageAttachments,
        removeAttachment: removeImageAttachment,
        clearAttachments: clearImageAttachments,
        pickImage,
        handlePaste,
    } = useImageAttachments();
    const [uploadingImageIds, setUploadingImageIds] = React.useState<Set<string>>(new Set());
    const [isSending, setIsSending] = React.useState(false);

    // Ref to track current selection for cursor-aware transcription insertion
    const selectionRef = React.useRef<{ start: number; end: number }>({ start: 0, end: 0 });

    // Ref to focus input after transcription
    const inputRef = React.useRef<MultiTextInputHandle>(null);

    // Ref to track if we're in auto-send mode (long-press recording)
    // When true, transcription completion will automatically send the message
    const autoSendModeRef = React.useRef(false);
    const sendAfterTranscriptionRef = React.useRef(false);
    const sendMessageWithTextRef = React.useRef<(text: string) => void>(() => {});

    // Transcription callback - handles cursor-aware insertion or auto-send
    const handleTranscription = React.useCallback((text: string) => {
        // Check if we're in auto-send mode (long-press recording)
        const shouldAutoSend = autoSendModeRef.current;
        const shouldSendAfterTranscription = sendAfterTranscriptionRef.current;

        // Reset auto-send mode immediately
        autoSendModeRef.current = false;
        sendAfterTranscriptionRef.current = false;

        if (shouldAutoSend && text.trim()) {
            // In auto-send mode: send the transcribed text directly
            // Note: We clear any existing draft text and send only the transcription
            setMessage('');
            clearDraft();
            sync.sendMessage(sessionId, text.trim());
            tracking?.capture('voice_transcription_completed', { auto_send: true });
            trackMessageSent();
        } else {
            // Normal mode: insert text at cursor position
            setMessage(prev => {
                const { start, end } = selectionRef.current;
                let newText = text;

                if (prev) {
                    // Insert at cursor position
                    const before = prev.slice(0, start);
                    const after = prev.slice(end);

                    // Add space before if there's text before and it doesn't end with whitespace
                    const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
                    // Add space after if there's text after and it doesn't start with whitespace
                    const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);

                    const insertText = (needsSpaceBefore ? ' ' : '') + text + (needsSpaceAfter ? ' ' : '');
                    newText = before + insertText + after;

                    // Update selection ref to position cursor after inserted text
                    const newCursorPos = start + insertText.length;
                    selectionRef.current = { start: newCursorPos, end: newCursorPos };
                }

                if (shouldSendAfterTranscription) {
                    setTimeout(() => {
                        sendMessageWithTextRef.current(newText);
                    }, 0);
                }

                return newText;
            });

            // Focus input after transcription only if NOT sending after transcription
            if (!shouldSendAfterTranscription) {
                inputRef.current?.focus();
            }
            tracking?.capture('voice_transcription_completed', { auto_send: false });
        }
    }, [sessionId, clearDraft]);

    // Error callback
    const handleTranscriptionError = React.useCallback((error: string) => {
        // Reset auto-send mode on error
        autoSendModeRef.current = false;
        sendAfterTranscriptionRef.current = false;
        Modal.alert(t('common.error'), error);
        tracking?.capture('voice_transcription_error', { error });
    }, []);

    // Use whisper transcription hook
    const {
        status: transcriptionStatus,
        startRecording,
        stopRecording,
        cancelRecording,
        isRecording,
    } = useWhisperTranscription({
        onTranscription: handleTranscription,
        onError: handleTranscriptionError,
    });

    // Handle dismissing CLI version warning
    const handleDismissCliWarning = React.useCallback(() => {
        if (machineId && cliVersion) {
            storage.getState().applyLocalSettings({
                acknowledgedCliVersions: {
                    ...acknowledgedCliVersions,
                    [machineId]: cliVersion
                }
            });
        }
    }, [machineId, cliVersion, acknowledgedCliVersions]);

    // Function to update permission mode
    const updatePermissionMode = React.useCallback((mode: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' | 'read-only' | 'safe-yolo' | 'yolo') => {
        storage.getState().updateSessionPermissionMode(sessionId, mode);
    }, [sessionId]);

    // Function to update model mode
    const updateModelMode = React.useCallback((mode: ModelMode) => {
        storage.getState().updateSessionModelMode(sessionId, mode);
    }, [sessionId]);

    // Handle switch to remote - switches to remote mode and aggressively syncs messages
    const handleSwitchToRemote = React.useCallback(async () => {
        // Switch session to remote mode
        await sessionSwitch(sessionId, 'remote');

        // Aggressively sync messages - invalidate to force a fresh fetch
        sync.onSessionVisible(sessionId);
    }, [sessionId]);

    // Memoize header-dependent styles to prevent re-renders
    const headerDependentStyles = React.useMemo(() => ({
        contentContainer: {
            flex: 1
        },
        flatListStyle: {
            marginTop: 0 // No marginTop needed since header is handled by parent
        },
    }), []);

    // Handle microphone button press - toggle recording
    const handleMicrophonePress = React.useCallback(async () => {
        if (transcriptionStatus === 'transcribing') {
            return; // Prevent actions during transcription
        }
        if (isRecording()) {
            // Stop recording and start transcription
            stopRecording();
            tracking?.capture('voice_recording_stopped');
        } else {
            // Start recording
            const started = await startRecording();
            if (started) {
                tracking?.capture('voice_recording_started');
            }
        }
    }, [transcriptionStatus, isRecording, stopRecording, startRecording]);

    // Handle long press on mic button - start auto-send mode recording
    const handleMicLongPressStart = React.useCallback(async () => {
        if (transcriptionStatus !== 'idle') {
            return; // Only start from idle state
        }
        // Enable auto-send mode
        autoSendModeRef.current = true;
        // Provide haptic feedback to indicate auto-send mode
        hapticsHeavy();
        // Start recording
        const started = await startRecording();
        if (started) {
            tracking?.capture('voice_recording_started', { auto_send_mode: true });
        } else {
            // Reset auto-send mode if recording failed to start
            autoSendModeRef.current = false;
        }
    }, [transcriptionStatus, startRecording]);

    // Handle press out on mic button - stop recording if in auto-send mode
    const handleMicPressOut = React.useCallback(() => {
        // Only stop if we're currently recording and in auto-send mode
        if (isRecording() && autoSendModeRef.current) {
            stopRecording();
            tracking?.capture('voice_recording_stopped', { auto_send_mode: true });
        }
    }, [isRecording, stopRecording]);

    const handleSendWhileRecording = React.useCallback(() => {
        if (transcriptionStatus === 'transcribing') {
            return;
        }
        if (!isRecording()) {
            return;
        }
        autoSendModeRef.current = false;
        sendAfterTranscriptionRef.current = true;
        stopRecording();
        tracking?.capture('voice_recording_stopped', { auto_send_mode: true });
    }, [transcriptionStatus, isRecording, stopRecording]);

    // Memoize mic button state to prevent flashing during transitions
    const micButtonState = useMemo(() => ({
        onMicPress: handleMicrophonePress,
        onMicLongPressStart: handleMicLongPressStart,
        onMicPressOut: handleMicPressOut,
        micStatus: transcriptionStatus === 'error' ? 'idle' : transcriptionStatus
    }), [handleMicrophonePress, handleMicLongPressStart, handleMicPressOut, transcriptionStatus]);

    // Trigger session visibility and initialize git status sync
    React.useLayoutEffect(() => {
        // Trigger session sync
        sync.onSessionVisible(sessionId);

        // Initialize git status sync for this session
        gitStatusSync.getSync(sessionId);
    }, [sessionId]);

    // Handle message selection - on desktop, show in debug panel; on mobile, navigate to detail
    const handleMessageSelect = React.useCallback((messageId: string) => {
        if (isDesktopSplitView) {
            setSelectedMessageId(messageId);
        } else {
            router.push(`/session/${sessionId}/message/${messageId}`);
        }
    }, [isDesktopSplitView, sessionId, router]);

    let content = (
        <>
            <Deferred>
                {messages.length > 0 && (
                    <ChatList
                        session={session}
                        onMessageSelect={isDesktopSplitView ? handleMessageSelect : undefined}
                        selectedMessageId={isDesktopSplitView ? selectedMessageId : undefined}
                    />
                )}
            </Deferred>
        </>
    );
    const placeholder = messages.length === 0 ? (
        <>
            {isLoaded ? (
                <EmptyMessages session={session} />
            ) : (
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            )}
        </>
    ) : null;

    // Handle sending message (with or without images)
    const sendMessageWithText = React.useCallback(async (text: string) => {
        const hasText = text.trim().length > 0;
        const hasImages = imageAttachments.length > 0;

        if (!hasText && !hasImages) return;

        const currentMessage = text;
        const currentImages = [...imageAttachments];

        // Clear input immediately for better UX
        setMessage('');
        clearDraft();
        clearImageAttachments();

        if (hasImages) {
            // Send with images
            setIsSending(true);
            setUploadingImageIds(new Set(currentImages.map(img => img.id)));

            try {
                const result = await sync.sendMessageWithImages(
                    sessionId,
                    currentMessage,
                    currentImages,
                    (imageId) => {
                        // Remove from uploading set as each image completes
                        setUploadingImageIds(prev => {
                            const next = new Set(prev);
                            next.delete(imageId);
                            return next;
                        });
                    }
                );

                if (!result.success && result.errors.length > 0) {
                    Modal.alert(t('common.error'), result.errors.join('\n'));
                }
            } finally {
                setIsSending(false);
                setUploadingImageIds(new Set());
            }
        } else {
            // Send text-only message
            sync.sendMessage(sessionId, currentMessage);
        }

        trackMessageSent();
    }, [imageAttachments, sessionId, clearDraft, clearImageAttachments]);

    const handleSend = React.useCallback(() => {
        sendMessageWithText(message);
    }, [message, sendMessageWithText]);

    React.useEffect(() => {
        sendMessageWithTextRef.current = sendMessageWithText;
    }, [sendMessageWithText]);

    const input = (
        <AgentInput
            ref={inputRef}
            placeholder={t('session.inputPlaceholder')}
            value={message}
            onChangeText={setMessage}
            sessionId={sessionId}
            permissionMode={permissionMode}
            onPermissionModeChange={updatePermissionMode}
            modelMode={modelMode}
            onModelModeChange={updateModelMode}
            metadata={session.metadata}
            connectionStatus={{
                text: sessionStatus.statusText,
                color: sessionStatus.statusColor,
                dotColor: sessionStatus.statusDotColor,
                isPulsing: sessionStatus.isPulsing
            }}
            onSend={handleSend}
            isSending={isSending}
            onMicPress={micButtonState.onMicPress}
            onMicLongPressStart={micButtonState.onMicLongPressStart}
            onMicPressOut={micButtonState.onMicPressOut}
            onCancelRecording={cancelRecording}
            micStatus={micButtonState.micStatus}
            onSendWhileRecording={handleSendWhileRecording}
            onAbort={() => sessionAbort(sessionId)}
            showAbortButton={sessionStatus.state === 'thinking' || sessionStatus.state === 'waiting'}
            onSwitchToRemote={handleSwitchToRemote}
            onFileViewerPress={() => router.push(`/session/${sessionId}/files`)}
            // Autocomplete configuration
            autocompletePrefixes={['@', '/']}
            autocompleteSuggestions={(query) => getSuggestions(sessionId, query)}
            usageData={sessionUsage ? {
                inputTokens: sessionUsage.inputTokens,
                outputTokens: sessionUsage.outputTokens,
                cacheCreation: sessionUsage.cacheCreation,
                cacheRead: sessionUsage.cacheRead,
                contextSize: sessionUsage.contextSize
            } : session.latestUsage ? {
                inputTokens: session.latestUsage.inputTokens,
                outputTokens: session.latestUsage.outputTokens,
                cacheCreation: session.latestUsage.cacheCreation,
                cacheRead: session.latestUsage.cacheRead,
                contextSize: session.latestUsage.contextSize
            } : undefined}
            alwaysShowContextSize={alwaysShowContextSize}
            // Selection tracking for cursor-aware transcription insertion
            onSelectionChange={(selection) => { selectionRef.current = selection; }}
            // Image attachment props
            imageAttachments={imageAttachments}
            onRemoveImageAttachment={removeImageAttachment}
            onPickImage={pickImage}
            uploadingImageIds={uploadingImageIds}
            onPaste={handlePaste}
        />
    );


    return (
        <>
            {/* CLI Version Warning Overlay - Subtle centered pill */}
            {shouldShowCliWarning && !(isLandscape && deviceType === 'phone') && (
                <Pressable
                    onPress={handleDismissCliWarning}
                    style={{
                        position: 'absolute',
                        top: safeArea.top + headerHeight + 8, // Position below header
                        alignSelf: 'center',
                        backgroundColor: '#FFF3CD',
                        borderRadius: 100, // Fully rounded pill
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        flexDirection: 'row',
                        alignItems: 'center',
                        zIndex: 998, // Below voice bar but above content
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 4,
                        elevation: 4,
                    }}
                >
                    <Ionicons name="warning-outline" size={14} color="#FF9500" style={{ marginRight: 6 }} />
                    <Text style={{
                        fontSize: 12,
                        color: '#856404',
                        fontWeight: '600'
                    }}>
                        {t('sessionInfo.cliVersionOutdated')}
                    </Text>
                    <Ionicons name="close" size={14} color="#856404" style={{ marginLeft: 8 }} />
                </Pressable>
            )}

            {/* Main content area - no padding since header is overlay */}
            <View style={{ flexBasis: 0, flexGrow: 1, paddingBottom: safeArea.bottom + ((isRunningOnMac() || Platform.OS === 'web') ? 32 : 0) }}>
                {isDesktopSplitView ? (
                    <View style={{ flexDirection: 'row', flex: 1 }}>
                        {/* Left: Chat List */}
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <AgentContentView
                                content={content}
                                input={input}
                                placeholder={placeholder}
                            />
                        </View>
                        {/* Right: Debug Transcript Panel */}
                        <View style={{
                            flex: 1,
                            minWidth: 0,
                            borderLeftWidth: 1,
                            borderLeftColor: theme.colors.divider,
                            backgroundColor: theme.colors.surface
                        }}>
                            <DebugTranscriptPanel
                                messages={messages}
                                metadata={session.metadata}
                                selectedMessageId={selectedMessageId}
                            />
                        </View>
                    </View>
                ) : (
                    <AgentContentView
                        content={content}
                        input={input}
                        placeholder={placeholder}
                    />
                )}
            </View >

            {/* Back button for landscape phone mode when header is hidden */}
            {
                isLandscape && deviceType === 'phone' && (
                    <Pressable
                        onPress={() => router.back()}
                        style={{
                            position: 'absolute',
                            top: safeArea.top + 8,
                            left: 16,
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: `rgba(${theme.dark ? '28, 23, 28' : '255, 255, 255'}, 0.9)`,
                            alignItems: 'center',
                            justifyContent: 'center',
                            ...Platform.select({
                                ios: {
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                },
                                android: {
                                    elevation: 2,
                                }
                            }),
                        }}
                        hitSlop={15}
                    >
                        <Ionicons
                            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
                            size={Platform.select({ ios: 28, default: 24 })}
                            color="#000"
                        />
                    </Pressable>
                )
            }
        </>
    )
}
