/**
 * useWhisperTranscription Hook
 *
 * A React hook that provides voice recording and transcription functionality
 * using expo-audio for recording and OpenAI's Whisper API for transcription.
 *
 * Features:
 * - Uses expo-audio's useAudioRecorder hook for recording
 * - 16kHz sample rate optimized for Whisper
 * - Language hint support from user settings
 * - Automatic permission handling
 *
 * Usage:
 *   const { status, startRecording, stopRecording, cancelRecording } = useWhisperTranscription({
 *       onTranscription: (text) => console.log('Transcribed:', text),
 *       onError: (error) => console.error('Error:', error),
 *   });
 */

import * as React from 'react';
import { Platform } from 'react-native';
import {
    useAudioRecorder,
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioRecorderState,
    AudioQuality,
    IOSOutputFormat,
    type RecordingOptions,
} from 'expo-audio';
import { File} from 'expo-file-system'
import { fetch } from 'expo/fetch';
import { storage } from '@/sync/storage';

// Transcription status type
export type TranscriptionStatus = 'idle' | 'recording' | 'transcribing' | 'error';

// ============================================================================
// Global Recording State
// ============================================================================
// This provides a way for external components (like CommandPaletteProvider)
// to observe and control recording state without being the hook owner.
// The actual hook instance manages the recording, but publishes state here.

type StatusChangeCallback = (status: TranscriptionStatus) => void;

let globalRecordingStatus: TranscriptionStatus = 'idle';
let globalStatusCallbacks: StatusChangeCallback[] = [];
let globalStartRecording: (() => Promise<boolean>) | null = null;
let globalStopRecording: (() => Promise<void>) | null = null;

/**
 * Subscribe to global recording status changes.
 * Used by components that need to observe status but don't manage recording.
 */
export function onStatusChange(callback: StatusChangeCallback): () => void {
    globalStatusCallbacks.push(callback);
    callback(globalRecordingStatus);
    return () => {
        globalStatusCallbacks = globalStatusCallbacks.filter(cb => cb !== callback);
    };
}

/**
 * Get current global recording status
 */
export function getRecordingStatus(): TranscriptionStatus {
    return globalRecordingStatus;
}

/**
 * Check if currently recording (global)
 */
export function isRecordingGlobal(): boolean {
    return globalRecordingStatus === 'recording';
}

/**
 * Start recording using the active hook instance.
 * Returns false if no hook is active or recording fails.
 */
export function startRecordingGlobal(): Promise<boolean> {
    if (globalStartRecording) {
        return globalStartRecording();
    }
    return Promise.resolve(false);
}

/**
 * Stop recording using the active hook instance.
 */
export function stopRecordingGlobal(): Promise<void> {
    if (globalStopRecording) {
        return globalStopRecording();
    }
    return Promise.resolve();
}

// Internal: update global state and notify subscribers
function setGlobalStatus(status: TranscriptionStatus): void {
    globalRecordingStatus = status;
    globalStatusCallbacks.forEach(cb => cb(status));
}

// Internal: register the active hook's functions
function registerGlobalControls(
    start: () => Promise<boolean>,
    stop: () => Promise<void>
): void {
    globalStartRecording = start;
    globalStopRecording = stop;
}

// Internal: unregister the active hook's functions
function unregisterGlobalControls(): void {
    globalStartRecording = null;
    globalStopRecording = null;
}

// Hook options
interface UseWhisperTranscriptionOptions {
    /** Called when transcription completes successfully */
    onTranscription?: (text: string) => void;
    /** Called when an error occurs */
    onError?: (error: string) => void;
}

// Hook return type
interface UseWhisperTranscriptionReturn {
    /** Current transcription status */
    status: TranscriptionStatus;
    /** Start recording audio */
    startRecording: () => Promise<boolean>;
    /** Stop recording and begin transcription */
    stopRecording: () => Promise<void>;
    /** Cancel recording without transcribing */
    cancelRecording: () => Promise<void>;
    /** Check if currently recording */
    isRecording: () => boolean;
}

// iOS-optimized recording options for Whisper (16kHz mono)
// Full RecordingOptions with all platforms to satisfy type requirements
const IOS_RECORDING_OPTIONS: RecordingOptions = {
    extension: '.m4a',
    sampleRate: 16000, // Whisper works best with 16kHz mono input
    numberOfChannels: 1,
    bitRate: 32000,
    android: {
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
    },
    ios: {
        outputFormat: IOSOutputFormat.MPEG4AAC,
        audioQuality: AudioQuality.MEDIUM,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
    },
    web: {
        // mimeType: 'audio/webm',
        bitsPerSecond: 32000,
    },
};

/**
 * Convert voice assistant language preference to Whisper language code (ISO 639-1)
 */
function getWhisperLanguageCode(preference: string): string | null {
    const languageMap: Record<string, string> = {
        'en': 'en', 'en-US': 'en', 'en-GB': 'en',
        'es': 'es', 'es-ES': 'es', 'es-MX': 'es',
        'fr': 'fr', 'fr-FR': 'fr',
        'de': 'de', 'de-DE': 'de',
        'it': 'it', 'it-IT': 'it',
        'pt': 'pt', 'pt-BR': 'pt', 'pt-PT': 'pt',
        'zh': 'zh', 'zh-CN': 'zh', 'zh-TW': 'zh', 'zh-Hans': 'zh', 'zh-Hant': 'zh',
        'ja': 'ja', 'ja-JP': 'ja',
        'ko': 'ko', 'ko-KR': 'ko',
        'ru': 'ru', 'ru-RU': 'ru',
        'ar': 'ar', 'ar-SA': 'ar',
        'hi': 'hi', 'hi-IN': 'hi',
        'nl': 'nl', 'nl-NL': 'nl',
        'pl': 'pl', 'pl-PL': 'pl',
        'tr': 'tr', 'tr-TR': 'tr',
        'vi': 'vi', 'vi-VN': 'vi',
        'th': 'th', 'th-TH': 'th',
        'id': 'id', 'id-ID': 'id',
        'uk': 'uk', 'uk-UA': 'uk',
        'cs': 'cs', 'cs-CZ': 'cs',
        'sv': 'sv', 'sv-SE': 'sv',
        'da': 'da', 'da-DK': 'da',
        'fi': 'fi', 'fi-FI': 'fi',
        'no': 'no', 'nb': 'no', 'nb-NO': 'no',
        'he': 'he', 'he-IL': 'he',
        'el': 'el', 'el-GR': 'el',
        'hu': 'hu', 'hu-HU': 'hu',
        'ro': 'ro', 'ro-RO': 'ro',
        'sk': 'sk', 'sk-SK': 'sk',
        'bg': 'bg', 'bg-BG': 'bg',
        'hr': 'hr', 'hr-HR': 'hr',
        'sl': 'sl', 'sl-SI': 'sl',
        'lt': 'lt', 'lt-LT': 'lt',
        'lv': 'lv', 'lv-LV': 'lv',
        'et': 'et', 'et-EE': 'et',
        'ms': 'ms', 'ms-MY': 'ms',
        'tl': 'tl', 'fil': 'tl', 'fil-PH': 'tl',
        'ca': 'ca', 'ca-ES': 'ca',
    };

    return languageMap[preference] || null;
}

/**
 * Get the OpenAI API key from settings
 */
function getOpenAIApiKey(): string | null {
    const settings = storage.getState().settings;
    return settings.openaiApiKey || null;
}

/**
 * useWhisperTranscription hook
 *
 * Provides voice recording and Whisper transcription functionality using expo-audio hooks.
 */
export function useWhisperTranscription(
    options: UseWhisperTranscriptionOptions = {}
): UseWhisperTranscriptionReturn {
    const { onTranscription, onError } = options;

    // Track transcription status separately from recorder state
    const [transcriptionStatus, setTranscriptionStatusInternal] = React.useState<TranscriptionStatus>('idle');

    // Wrapper to update both local and global status
    const setTranscriptionStatus = React.useCallback((status: TranscriptionStatus | ((prev: TranscriptionStatus) => TranscriptionStatus)) => {
        setTranscriptionStatusInternal(prev => {
            const newStatus = typeof status === 'function' ? status(prev) : status;
            setGlobalStatus(newStatus);
            return newStatus;
        });
    }, []);

    // Android needs the stock high-quality preset for a standards-compliant M4A container.
    // iOS can safely use the leaner 16kHz mono profile that Whisper prefers.
    const recordingOptions = IOS_RECORDING_OPTIONS;

    // Use expo-audio's recorder hook
    const audioRecorder = useAudioRecorder(recordingOptions);
    const recorderState = useAudioRecorderState(audioRecorder);

    // Track permission status - starts as null, will be requested when user starts recording
    const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);

    // Store callbacks in refs to avoid dependency issues
    const onTranscriptionRef = React.useRef(onTranscription);
    const onErrorRef = React.useRef(onError);
    React.useEffect(() => {
        onTranscriptionRef.current = onTranscription;
        onErrorRef.current = onError;
    }, [onTranscription, onError]);

    /**
     * Transcribe audio using OpenAI Whisper API
     */
    const transcribeAudio = React.useCallback(async (fileUri: string): Promise<void> => {
        const apiKey = getOpenAIApiKey();
        if (!apiKey) {
            setTranscriptionStatus('error');
            onErrorRef.current?.('OpenAI API key not configured');
            return;
        }

        try {
            // Shared parameters for upload
            const parameters: Record<string, string> = {
                model: 'whisper-1',
            };

            // Add language hint if configured
            const settings = storage.getState().settings;
            if (settings.voiceAssistantLanguage) {
                const languageCode = getWhisperLanguageCode(settings.voiceAssistantLanguage);
                if (languageCode) {
                    parameters.language = languageCode;
                }
            }

            // Add custom vocabulary as prompt if configured
            if (settings.whisperVocabulary) {
                // Clean up the vocabulary: split by commas or newlines, trim, and rejoin
                const vocabulary = settings.whisperVocabulary
                    .split(/[,\n]+/)
                    .map(word => word.trim())
                    .filter(word => word.length > 0)
                    .join(', ');
                if (vocabulary) {
                    parameters.prompt = vocabulary;
                }
            }

            // Upload via fetch with FormData
            const formData = new FormData();
            if (Platform.OS === 'web') {
                const blob = await fetch(fileUri).then(res => res.blob());
                console.log('Uploading blob:', blob);
                formData.append('file', blob, 'recording.m4a');
            } else {
                formData.append('file', new File(fileUri), 'recording.m4a');
            }
            Object.entries(parameters).forEach(([key, value]) => formData.append(key, value));

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || `API error: ${response.status}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const transcribedText = data.text?.trim() || '';

            setTranscriptionStatus('idle');

            if (transcribedText) {
                onTranscriptionRef.current?.(transcribedText);
            }
        } catch (error) {
            console.error('Transcription failed:', error);
            setTranscriptionStatus('error');
            onErrorRef.current?.(error instanceof Error ? error.message : 'Transcription failed');
            setTimeout(() => {
                setTranscriptionStatus((prev) => prev === 'error' ? 'idle' : prev);
            }, 2000);
        }
    }, []);

    /**
     * Start recording audio
     */
    const startRecording = React.useCallback(async (): Promise<boolean> => {
        if (transcriptionStatus !== 'idle') {
            console.warn('Already recording or transcribing');
            return false;
        }

        const apiKey = getOpenAIApiKey();
        if (!apiKey) {
            setTranscriptionStatus('error');
            onErrorRef.current?.('OpenAI API key not configured. Please add it in Settings > Voice.');
            return false;
        }

        try {
            // Check/request microphone permission
            if (hasPermission === null) {
                const status = await AudioModule.requestRecordingPermissionsAsync();
                setHasPermission(status.granted);
                if (!status.granted) {
                    setTranscriptionStatus('error');
                    onErrorRef.current?.('Microphone permission denied');
                    return false;
                }
            } else if (!hasPermission) {
                setTranscriptionStatus('error');
                onErrorRef.current?.('Microphone permission denied');
                return false;
            }

            // Enable recording mode on iOS (required before recording)
            await setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: true,
            });

            // Prepare and start recording
            await audioRecorder.prepareToRecordAsync();
            audioRecorder.record();

            setTranscriptionStatus('recording');
            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            setTranscriptionStatus('error');
            onErrorRef.current?.('Failed to start recording');
            return false;
        }
    }, [transcriptionStatus, hasPermission, audioRecorder]);

    /**
     * Stop recording and start transcription
     */
    const stopRecording = React.useCallback(async (): Promise<void> => {
        if (transcriptionStatus !== 'recording') {
            return;
        }

        setTranscriptionStatus('transcribing');

        try {
            await audioRecorder.stop();
            const uri = audioRecorder.uri;

            // Disable recording mode on iOS
            try {
                await setAudioModeAsync({ allowsRecording: false });
            } catch (e) {
                // Ignore errors when disabling recording mode
            }

            if (uri) {
                await transcribeAudio(uri);
            } else {
                setTranscriptionStatus('idle');
            }
        } catch (error) {
            console.error('Failed to stop recording:', error);
            setTranscriptionStatus('error');
            onErrorRef.current?.('Failed to stop recording');
            setTimeout(() => {
                setTranscriptionStatus((prev) => prev === 'error' ? 'idle' : prev);
            }, 2000);
        }
    }, [transcriptionStatus, audioRecorder, transcribeAudio]);

    /**
     * Cancel recording without transcribing
     */
    const cancelRecording = React.useCallback(async (): Promise<void> => {
        try {
            audioRecorder.stop();
        } catch (e) {
            // Ignore errors when canceling
        }

        // Disable recording mode on iOS
        try {
            await setAudioModeAsync({ allowsRecording: false });
        } catch (e) {
            // Ignore errors when disabling recording mode
        }

        setTranscriptionStatus('idle');
    }, [audioRecorder]);

    /**
     * Check if currently recording
     */
    const isRecordingFn = React.useCallback((): boolean => {
        return transcriptionStatus === 'recording';
    }, [transcriptionStatus]);

    // Register this hook instance as the global controller
    React.useEffect(() => {
        registerGlobalControls(startRecording, stopRecording);
        return () => {
            unregisterGlobalControls();
        };
    }, [startRecording, stopRecording]);

    return {
        status: transcriptionStatus,
        startRecording,
        stopRecording,
        cancelRecording,
        isRecording: isRecordingFn,
    };
}
