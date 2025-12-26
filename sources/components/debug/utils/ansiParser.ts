import { AnsiSegment } from '../types';

/**
 * ANSI color codes mapping
 * Based on standard terminal colors and modern terminal emulators
 */
const ANSI_COLORS = {
    // Standard foreground colors (30-37)
    30: '#000000', // Black
    31: '#E74856', // Red
    32: '#16C60C', // Green
    33: '#F9F1A5', // Yellow
    34: '#3B78FF', // Blue
    35: '#B4009E', // Magenta
    36: '#61D6D6', // Cyan
    37: '#CCCCCC', // White

    // Bright foreground colors (90-97)
    90: '#767676', // Bright Black (Gray)
    91: '#FF5555', // Bright Red
    92: '#50FA7B', // Bright Green
    93: '#FFD93D', // Bright Yellow
    94: '#66D9EF', // Bright Blue
    95: '#F92672', // Bright Magenta
    96: '#A1EFE4', // Bright Cyan
    97: '#F8F8F2', // Bright White
};

const ANSI_BG_COLORS = {
    // Standard background colors (40-47)
    40: '#000000', // Black
    41: '#E74856', // Red
    42: '#16C60C', // Green
    43: '#F9F1A5', // Yellow
    44: '#3B78FF', // Blue
    45: '#B4009E', // Magenta
    46: '#61D6D6', // Cyan
    47: '#CCCCCC', // White

    // Bright background colors (100-107)
    100: '#767676', // Bright Black
    101: '#FF5555', // Bright Red
    102: '#50FA7B', // Bright Green
    103: '#FFD93D', // Bright Yellow
    104: '#66D9EF', // Bright Blue
    105: '#F92672', // Bright Magenta
    106: '#A1EFE4', // Bright Cyan
    107: '#F8F8F2', // Bright White
};

/**
 * Parses ANSI escape codes and converts them to styled segments for React Native
 * Supports: colors, bold, italic, underline
 */
export function parseAnsi(text: string): AnsiSegment[] {
    const segments: AnsiSegment[] = [];

    // ANSI escape code pattern: \x1b[...m or \u001b[...m
    const ansiPattern = /\x1b\[([0-9;]*)m|\u001b\[([0-9;]*)m/g;

    let lastIndex = 0;
    let currentStyle: Partial<AnsiSegment> = {};

    let match: RegExpExecArray | null;

    while ((match = ansiPattern.exec(text)) !== null) {
        const matchIndex = match.index;
        const codes = (match[1] || match[2] || '').split(';').map(c => parseInt(c, 10) || 0);

        // Add text before this escape code (with current styling)
        if (matchIndex > lastIndex) {
            const textSegment = text.substring(lastIndex, matchIndex);
            if (textSegment) {
                segments.push({
                    text: textSegment,
                    ...currentStyle,
                });
            }
        }

        // Process ANSI codes
        for (const code of codes) {
            if (code === 0) {
                // Reset all styles
                currentStyle = {};
            } else if (code === 1) {
                // Bold
                currentStyle.bold = true;
            } else if (code === 3) {
                // Italic
                currentStyle.italic = true;
            } else if (code === 4) {
                // Underline
                currentStyle.underline = true;
            } else if (code === 22) {
                // Normal intensity (unbold)
                currentStyle.bold = false;
            } else if (code === 23) {
                // Not italic
                currentStyle.italic = false;
            } else if (code === 24) {
                // Not underlined
                currentStyle.underline = false;
            } else if (code >= 30 && code <= 37) {
                // Foreground color
                currentStyle.color = ANSI_COLORS[code as keyof typeof ANSI_COLORS];
            } else if (code >= 90 && code <= 97) {
                // Bright foreground color
                currentStyle.color = ANSI_COLORS[code as keyof typeof ANSI_COLORS];
            } else if (code >= 40 && code <= 47) {
                // Background color
                currentStyle.backgroundColor = ANSI_BG_COLORS[code as keyof typeof ANSI_BG_COLORS];
            } else if (code >= 100 && code <= 107) {
                // Bright background color
                currentStyle.backgroundColor = ANSI_BG_COLORS[code as keyof typeof ANSI_BG_COLORS];
            } else if (code === 39) {
                // Default foreground color
                delete currentStyle.color;
            } else if (code === 49) {
                // Default background color
                delete currentStyle.backgroundColor;
            }
        }

        lastIndex = matchIndex + match[0].length;
    }

    // Add remaining text after last escape code
    if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex);
        if (remainingText) {
            segments.push({
                text: remainingText,
                ...currentStyle,
            });
        }
    }

    // If no ANSI codes found, return entire text as single segment
    if (segments.length === 0) {
        segments.push({ text });
    }

    return segments;
}

/**
 * Strips all ANSI escape codes from text
 */
export function stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m|\u001b\[[0-9;]*m/g, '');
}

/**
 * Checks if text contains ANSI escape codes
 */
export function hasAnsi(text: string): boolean {
    return /\x1b\[[0-9;]*m|\u001b\[[0-9;]*m/.test(text);
}
