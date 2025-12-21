import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Keyboard shortcut handlers configuration
 */
export interface KeyboardHandlers {
    onCommandPalette?: () => void;
    onNewSession?: () => void;
    onArchiveSession?: () => void;
    onDeleteSession?: () => void;
    onToggleVoiceRecording?: () => void;
    onPrevSession?: () => void;
    onNextSession?: () => void;
}

/**
 * Hook for handling global keyboard shortcuts on web
 * Supports: ⌘K (palette), ⌘⇧O (new session), ⌘⇧A (archive), ⌘⌫ (delete), ⌘⇧V (voice), ⌥↑/↓ (prev/next session)
 */
export function useGlobalKeyboard(onCommandPalette: () => void, handlers?: Omit<KeyboardHandlers, 'onCommandPalette'>) {
    useEffect(() => {
        if (Platform.OS !== 'web') {
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for CMD (Mac) or Ctrl (Windows/Linux)
            const isModifierPressed = e.metaKey || e.ctrlKey;
            const isShiftPressed = e.shiftKey;

            // ⌘K - Open command palette
            if (isModifierPressed && e.key === 'k') {
                e.preventDefault();
                e.stopPropagation();
                onCommandPalette();
                return;
            }

            // ⌘⇧O - New session
            if (isModifierPressed && isShiftPressed && e.key.toLowerCase() === 'o') {
                e.preventDefault();
                e.stopPropagation();
                handlers?.onNewSession?.();
                return;
            }

            // ⌘⇧A - Archive session
            if (isModifierPressed && isShiftPressed && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                e.stopPropagation();
                handlers?.onArchiveSession?.();
                return;
            }

            // ⌘⌫ (Backspace) - Delete session
            if (isModifierPressed && e.key === 'Backspace') {
                e.preventDefault();
                e.stopPropagation();
                handlers?.onDeleteSession?.();
                return;
            }

            // ⌘⇧V - Toggle voice recording
            if (isModifierPressed && isShiftPressed && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                e.stopPropagation();
                handlers?.onToggleVoiceRecording?.();
                return;
            }

            // ⌥↑ - Previous session
            if (e.altKey && e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                handlers?.onPrevSession?.();
                return;
            }

            // ⌥↓ - Next session
            if (e.altKey && e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                handlers?.onNextSession?.();
                return;
            }
        };

        // Add event listener
        window.addEventListener('keydown', handleKeyDown);

        // Cleanup
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onCommandPalette, handlers]);
}