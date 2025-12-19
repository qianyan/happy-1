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
}

/**
 * Hook for handling global keyboard shortcuts on web
 * Supports: ⌘K (palette), ⌘⇧O (new session), ⌘⇧A (archive), ⌘⌫ (delete)
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
        };

        // Add event listener
        window.addEventListener('keydown', handleKeyDown);

        // Cleanup
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onCommandPalette, handlers]);
}