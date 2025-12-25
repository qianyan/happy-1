import { Platform } from 'react-native';

/**
 * Detects if the current platform uses Mac-style keyboard shortcuts (⌘)
 * or Windows/Linux style (Ctrl).
 *
 * On web, checks navigator.platform for Mac detection.
 * On native iOS, always uses Mac style.
 * On native Android, always uses Windows/Linux style.
 */
export function isMacPlatform(): boolean {
    if (Platform.OS === 'ios') {
        return true;
    }
    if (Platform.OS === 'android') {
        return false;
    }
    // Web platform - check navigator
    if (typeof navigator !== 'undefined' && navigator.platform) {
        return navigator.platform.toUpperCase().includes('MAC');
    }
    // Default to Mac style if we can't detect
    return true;
}

/**
 * Modifier key symbols for keyboard shortcuts.
 * Uses Mac symbols (⌘, ⌥, ⇧, ⌃) on macOS, text abbreviations on Windows/Linux.
 */
export const ModifierKey = {
    /** Command on Mac, Ctrl on Windows/Linux */
    get command(): string {
        return isMacPlatform() ? '⌘' : 'Ctrl+';
    },
    /** Option/Alt key */
    get alt(): string {
        return isMacPlatform() ? '⌥' : 'Alt+';
    },
    /** Shift key */
    get shift(): string {
        return isMacPlatform() ? '⇧' : 'Shift+';
    },
    /** Control key (distinct from command on Mac) */
    get control(): string {
        return isMacPlatform() ? '⌃' : 'Ctrl+';
    },
} as const;

/**
 * Special key symbols for keyboard shortcuts.
 */
export const SpecialKey = {
    /** Backspace/Delete key */
    get backspace(): string {
        return isMacPlatform() ? '⌫' : 'Backspace';
    },
    /** Delete key (forward delete) */
    get delete(): string {
        return isMacPlatform() ? '⌦' : 'Delete';
    },
    /** Enter/Return key */
    get enter(): string {
        return isMacPlatform() ? '↩' : 'Enter';
    },
    /** Escape key */
    get escape(): string {
        return isMacPlatform() ? '⎋' : 'Esc';
    },
    /** Tab key */
    get tab(): string {
        return isMacPlatform() ? '⇥' : 'Tab';
    },
    /** Up arrow */
    get arrowUp(): string {
        return '↑';
    },
    /** Down arrow */
    get arrowDown(): string {
        return '↓';
    },
    /** Left arrow */
    get arrowLeft(): string {
        return '←';
    },
    /** Right arrow */
    get arrowRight(): string {
        return '→';
    },
} as const;

/**
 * Options for creating a keyboard shortcut display string.
 */
export interface ShortcutOptions {
    command?: boolean;
    alt?: boolean;
    shift?: boolean;
    control?: boolean;
    key: string;
}

/**
 * Creates a keyboard shortcut display string.
 * Automatically uses the correct symbols for the current platform.
 *
 * @example
 * // On Mac: "⌘K", on Windows: "Ctrl+K"
 * shortcut({ command: true, key: 'K' })
 *
 * // On Mac: "⌘⇧O", on Windows: "Ctrl+Shift+O"
 * shortcut({ command: true, shift: true, key: 'O' })
 *
 * // On Mac: "⌥↑", on Windows: "Alt+↑"
 * shortcut({ alt: true, key: 'arrowUp' })
 */
export function shortcut(options: ShortcutOptions): string {
    const parts: string[] = [];
    const isMac = isMacPlatform();

    // Order: Ctrl, Alt, Shift, Command (standard order)
    if (options.control) {
        parts.push(ModifierKey.control);
    }
    if (options.alt) {
        parts.push(ModifierKey.alt);
    }
    if (options.shift) {
        parts.push(ModifierKey.shift);
    }
    if (options.command) {
        parts.push(ModifierKey.command);
    }

    // Handle special keys
    let keyDisplay = options.key;
    switch (options.key.toLowerCase()) {
        case 'backspace':
            keyDisplay = SpecialKey.backspace;
            break;
        case 'delete':
            keyDisplay = SpecialKey.delete;
            break;
        case 'enter':
        case 'return':
            keyDisplay = SpecialKey.enter;
            break;
        case 'escape':
        case 'esc':
            keyDisplay = SpecialKey.escape;
            break;
        case 'tab':
            keyDisplay = SpecialKey.tab;
            break;
        case 'arrowup':
            keyDisplay = SpecialKey.arrowUp;
            break;
        case 'arrowdown':
            keyDisplay = SpecialKey.arrowDown;
            break;
        case 'arrowleft':
            keyDisplay = SpecialKey.arrowLeft;
            break;
        case 'arrowright':
            keyDisplay = SpecialKey.arrowRight;
            break;
    }

    parts.push(keyDisplay);

    // On Mac, symbols are concatenated directly (⌘⇧O)
    // On Windows/Linux, we use + separator but it's already in the modifier strings
    if (isMac) {
        return parts.join('');
    } else {
        // Remove trailing + from the last modifier before joining with key
        // The modifiers already end with +, so we just concatenate
        return parts.join('');
    }
}

/**
 * Creates a platform-specific keyboard shortcut display string.
 * Use this when different platforms need completely different shortcuts.
 *
 * @example
 * // Mac: "⌥↑", Windows: "Ctrl+Shift+↑"
 * shortcutPlatformSpecific(
 *     { alt: true, key: 'arrowUp' },           // Mac
 *     { command: true, shift: true, key: 'arrowUp' }  // Windows/Linux
 * )
 */
export function shortcutPlatformSpecific(
    macOptions: ShortcutOptions,
    windowsOptions: ShortcutOptions
): string {
    return isMacPlatform() ? shortcut(macOptions) : shortcut(windowsOptions);
}
