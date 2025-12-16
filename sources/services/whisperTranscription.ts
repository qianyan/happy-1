/**
 * Whisper Transcription Service - Web Implementation
 *
 * Records audio using MediaRecorder API and transcribes it using OpenAI's Whisper API.
 */

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

// Web-specific state
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

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
 * Transcribe audio blob using OpenAI Whisper API
 */
async function transcribeAudio(blob: Blob): Promise<void> {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
        setStatus('error');
        errorCallback?.('OpenAI API key not configured');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');
        formData.append('model', 'whisper-1');

        // Add language hint if configured
        const settings = storage.getState().settings;
        if (settings.voiceAssistantLanguage) {
            const languageCode = getWhisperLanguageCode(settings.voiceAssistantLanguage);
            if (languageCode) {
                formData.append('language', languageCode);
            }
        }

        // Send to OpenAI Whisper API
        const apiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: formData,
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `API error: ${apiResponse.status}`;
            throw new Error(errorMessage);
        }

        const data = await apiResponse.json();
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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.start();
        setStatus('recording');
        return true;
    } catch (error) {
        console.error('Failed to start web recording:', error);
        setStatus('error');
        errorCallback?.('Microphone permission denied');
        return false;
    }
}

/**
 * Stop recording and start transcription
 */
export async function stopRecording(): Promise<void> {
    if (currentStatus !== 'recording' || !mediaRecorder) {
        return;
    }

    setStatus('transcribing');

    return new Promise((resolve) => {
        mediaRecorder!.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];

            // Stop all tracks
            mediaRecorder!.stream.getTracks().forEach(track => track.stop());
            mediaRecorder = null;

            await transcribeAudio(audioBlob);
            resolve();
        };

        mediaRecorder.stop();
    });
}

/**
 * Cancel recording without transcribing
 */
export async function cancelRecording(): Promise<void> {
    if (mediaRecorder) {
        try {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            mediaRecorder.stop();
        } catch (e) {
            // Ignore errors when canceling
        }
        mediaRecorder = null;
        audioChunks = [];
    }
    setStatus('idle');
}
