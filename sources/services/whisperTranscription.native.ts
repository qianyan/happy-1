/**
 * Whisper Transcription Service - Native Implementation (iOS/Android)
 *
 * Records audio using expo-audio and transcribes it using OpenAI's Whisper API.
 */

import { AudioModule, AudioQuality, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { File } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';
import { storage } from '@/sync/storage';

// Transcription status
export type TranscriptionStatus = 'idle' | 'recording' | 'transcribing' | 'error';

// Callback types
type StatusChangeCallback = (status: TranscriptionStatus) => void;
type TranscriptionCallback = (text: string) => void;
type ErrorCallback = (error: string) => void;

// Global state
let currentStatus: TranscriptionStatus = 'idle';
let statusChangeCallbacks: StatusChangeCallback[] = [];
let transcriptionCallback: TranscriptionCallback | null = null;
let errorCallback: ErrorCallback | null = null;

// Audio recorder instance
let audioRecorder: InstanceType<typeof AudioModule.AudioRecorder> | null = null;

const IOS_RECORDING_OPTIONS = {
    extension: '.m4a',
    sampleRate: 16000,  // Whisper works best with 16kHz mono input
    numberOfChannels: 1,
    bitRate: 32000,
    ios: {
        audioQuality: AudioQuality.MEDIUM,
    },
};

/**
 * Subscribe to status changes
 */
export function onStatusChange(callback: StatusChangeCallback): () => void {
    statusChangeCallbacks.push(callback);
    callback(currentStatus);
    return () => {
        statusChangeCallbacks = statusChangeCallbacks.filter(cb => cb !== callback);
    };
}

/**
 * Set the transcription result callback
 */
export function setTranscriptionCallback(callback: TranscriptionCallback | null): void {
    transcriptionCallback = callback;
}

/**
 * Set the error callback
 */
export function setErrorCallback(callback: ErrorCallback | null): void {
    errorCallback = callback;
}

/**
 * Update status and notify subscribers
 */
function setStatus(status: TranscriptionStatus): void {
    currentStatus = status;
    statusChangeCallbacks.forEach(cb => cb(status));
}

/**
 * Get current transcription status
 */
export function getTranscriptionStatus(): TranscriptionStatus {
    return currentStatus;
}

/**
 * Get the OpenAI API key from settings
 */
function getOpenAIApiKey(): string | null {
    const settings = storage.getState().settings;
    return settings.openaiApiKey || null;
}

/**
 * Check if currently recording
 */
export function isRecording(): boolean {
    return currentStatus === 'recording';
}

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
 * Transcribe audio using OpenAI Whisper API
 * Uses expo/fetch with File blob for reliable uploads on Android
 */
async function transcribeAudio(fileUri: string): Promise<void> {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
        setStatus('error');
        errorCallback?.('OpenAI API key not configured');
        return;
    }

    try {
        const file = new File(fileUri);
        let fileSize: number | null = null;
        try {
            const fileInfo = file.info();
            fileSize = (fileInfo as any)?.size ?? null;
        } catch (e) {
            console.warn('Failed to read recording info:', e);
        }

        if (!fileSize) {
            throw new Error('Recorded audio file is empty');
        }

        const fileName = file.name || 'recording.m4a';
        const extension = fileName.split('.').pop()?.toLowerCase();
        const defaultMime = Platform.OS === 'android' ? 'audio/mp4' : 'audio/m4a';
        const mimeType = extension === 'webm'
            ? 'audio/webm'
            : extension === 'wav'
                ? 'audio/wav'
                : extension === 'mp3'
                    ? 'audio/mpeg'
                    : defaultMime;

        // Shared parameters for both upload paths
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

        if (Platform.OS === 'android') {
            const uploadResult = await FileSystemLegacy.uploadAsync(
                'https://api.openai.com/v1/audio/transcriptions',
                fileUri,
                {
                    uploadType: FileSystemLegacy.FileSystemUploadType.MULTIPART,
                    fieldName: 'file',
                    mimeType,
                    parameters,
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                    },
                }
            );

            if (uploadResult.status !== 200) {
                const errorData = JSON.parse(uploadResult.body || '{}');
                const errorMessage = errorData.error?.message || `API error: ${uploadResult.status}`;
                throw new Error(errorMessage);
            }

            const data = JSON.parse(uploadResult.body);
            const transcribedText = data.text?.trim() || '';

            setStatus('idle');

            if (transcribedText) {
                transcriptionCallback?.(transcribedText);
            }
            return;
        }

        // Non-Android platforms can use Blob/FormData via fetch
        const formData = new FormData();
        formData.append('file', file as unknown as Blob, fileName);
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

        setStatus('idle');

        if (transcribedText) {
            transcriptionCallback?.(transcribedText);
        }
    } catch (error) {
        console.error('Transcription failed:', error);
        setStatus('error');
        errorCallback?.(error instanceof Error ? error.message : 'Transcription failed');
        setTimeout(() => {
            if (currentStatus === 'error') setStatus('idle');
        }, 2000);
    }
}

/**
 * Start recording audio
 */
export async function startRecording(): Promise<boolean> {
    if (currentStatus !== 'idle') {
        console.warn('Already recording or transcribing');
        return false;
    }

    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
        setStatus('error');
        errorCallback?.('OpenAI API key not configured. Please add it in Settings > Voice.');
        return false;
    }

    try {
        // Request microphone permission
        const permissionStatus = await AudioModule.requestRecordingPermissionsAsync();
        if (!permissionStatus.granted) {
            setStatus('error');
            errorCallback?.('Microphone permission denied');
            return false;
        }

        // Enable recording mode on iOS (required before recording)
        await setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: true,
        });

        // Android needs the stock high-quality preset for a standards-compliant M4A container.
        // iOS can safely use the leaner 16kHz mono profile that Whisper prefers.
        const recordingOptions =
            Platform.OS === 'android' ? RecordingPresets.HIGH_QUALITY : IOS_RECORDING_OPTIONS;

        audioRecorder = new AudioModule.AudioRecorder(recordingOptions);

        // Prepare and start recording
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();

        setStatus('recording');
        return true;
    } catch (error) {
        console.error('Failed to start native recording:', error);
        setStatus('error');
        errorCallback?.('Failed to start recording');
        return false;
    }
}

/**
 * Stop recording and start transcription
 */
export async function stopRecording(): Promise<void> {
    if (currentStatus !== 'recording' || !audioRecorder) {
        return;
    }

    setStatus('transcribing');

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
            // Use FileSystem.uploadAsync for reliable file upload
            await transcribeAudio(uri);
        } else {
            setStatus('idle');
        }
    } catch (error) {
        console.error('Failed to stop recording:', error);
        setStatus('error');
        errorCallback?.('Failed to stop recording');
        setTimeout(() => {
            if (currentStatus === 'error') setStatus('idle');
        }, 2000);
    } finally {
        audioRecorder = null;
    }
}

/**
 * Cancel recording without transcribing
 */
export async function cancelRecording(): Promise<void> {
    if (audioRecorder) {
        try {
            audioRecorder.stop();
        } catch (e) {
            // Ignore errors when canceling
        }
        audioRecorder = null;

        // Disable recording mode on iOS
        try {
            await setAudioModeAsync({ allowsRecording: false });
        } catch (e) {
            // Ignore errors when disabling recording mode
        }
    }
    setStatus('idle');
}
