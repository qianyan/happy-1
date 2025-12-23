import type { MarkdownSpan } from "./parseMarkdown";

// Updated pattern to handle nested markdown and asterisks
const pattern = /(\*\*(.*?)(?:\*\*|$))|(\*(.*?)(?:\*|$))|(\[([^\]]+)\](?:\(([^)]+)\))?)|(`(.*?)(?:`|$))/g;

// Pattern to detect bare URLs (not already part of markdown links)
const urlPattern = /https?:\/\/[^\s<>\[\]()]+/g;

/**
 * Convert bare URLs in plain text spans into clickable link spans.
 * Only processes spans that have no URL already set (plain text spans).
 */
function autoLinkUrls(spans: MarkdownSpan[]): MarkdownSpan[] {
    const result: MarkdownSpan[] = [];

    for (const span of spans) {
        // Skip spans that already have a URL or are code spans
        if (span.url !== null || span.styles.includes('code')) {
            result.push(span);
            continue;
        }

        // Find all URLs in the text
        const text = span.text;
        urlPattern.lastIndex = 0;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = urlPattern.exec(text)) !== null) {
            // Add text before the URL as plain text
            if (match.index > lastIndex) {
                result.push({
                    styles: span.styles,
                    text: text.slice(lastIndex, match.index),
                    url: null
                });
            }

            // Add the URL as a link span
            const url = match[0];
            result.push({
                styles: span.styles,
                text: url,
                url: url
            });

            lastIndex = urlPattern.lastIndex;
        }

        // Add remaining text after the last URL
        if (lastIndex < text.length) {
            result.push({
                styles: span.styles,
                text: text.slice(lastIndex),
                url: null
            });
        } else if (lastIndex === 0) {
            // No URLs found, keep original span
            result.push(span);
        }
    }

    return result;
}

export function parseMarkdownSpans(markdown: string, header: boolean) {
    const spans: MarkdownSpan[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(markdown)) !== null) {
        // Capture the text between the end of the last match and the start of this match as plain text
        const plainText = markdown.slice(lastIndex, match.index);
        if (plainText) {
            spans.push({ styles: [], text: plainText, url: null });
        }

        if (match[1]) {
            // Bold
            if (header) {
                spans.push({ styles: [], text: match[2], url: null });
            } else {
                spans.push({ styles: ['bold'], text: match[2], url: null });
            }
        } else if (match[3]) {
            // Italic
            if (header) {
                spans.push({ styles: [], text: match[4], url: null });
            } else {
                spans.push({ styles: ['italic'], text: match[4], url: null });
            }
        } else if (match[5]) {
            // Link - handle incomplete links (no URL part)
            if (match[7]) {
                spans.push({ styles: [], text: match[6], url: match[7] });
            } else {
                // If no URL part, treat as plain text with brackets
                spans.push({ styles: [], text: `[${match[6]}]`, url: null });
            }
        } else if (match[8]) {
            // Inline code
            spans.push({ styles: ['code'], text: match[9], url: null });
        }

        lastIndex = pattern.lastIndex;
    }

    // If there's any text remaining after the last match, treat it as plain
    if (lastIndex < markdown.length) {
        spans.push({ styles: [], text: markdown.slice(lastIndex), url: null });
    }

    // Auto-link bare URLs in plain text spans
    return autoLinkUrls(spans);
}