import type { MarkdownBlock } from "./parseMarkdown";
import { parseMarkdownSpans } from "./parseMarkdownSpans";

function parseTable(lines: string[], startIndex: number): { table: MarkdownBlock | null; nextIndex: number } {
    let index = startIndex;
    const tableLines: string[] = [];

    // Collect consecutive lines that contain unescaped pipe characters to identify potential table rows
    // A pipe is considered unescaped if it's not preceded by a backslash (accounting for double backslashes)
    const hasUnescapedPipe = (line: string): boolean => {
        let i = 0;
        while (i < line.length) {
            if (line[i] === '\\' && i + 1 < line.length) {
                i += 2; // Skip escaped character
            } else if (line[i] === '|') {
                return true; // Found unescaped pipe
            } else {
                i++;
            }
        }
        return false;
    };

    while (index < lines.length && hasUnescapedPipe(lines[index])) {
        tableLines.push(lines[index]);
        index++;
    }

    if (tableLines.length < 2) {
        return { table: null, nextIndex: startIndex };
    }

    // Validate that the second line is a separator containing dashes, which distinguishes tables from plain text
    const separatorLine = tableLines[1].trim();
    const isSeparator = /^[|\s\-:=]*$/.test(separatorLine) && separatorLine.includes('-');

    if (!isSeparator) {
        return { table: null, nextIndex: startIndex };
    }

    // Split on unescaped pipes only, and unescape the result
    const splitOnUnescapedPipes = (line: string): string[] => {
        const parts: string[] = [];
        let current = '';
        let i = 0;

        while (i < line.length) {
            if (line[i] === '\\' && i + 1 < line.length) {
                // Escaped character - add the next character literally
                current += line[i + 1];
                i += 2;
            } else if (line[i] === '|') {
                // Unescaped pipe - this is a delimiter
                parts.push(current.trim());
                current = '';
                i++;
            } else {
                current += line[i];
                i++;
            }
        }
        // Add the last part
        parts.push(current.trim());
        return parts.filter(cell => cell.length > 0);
    };

    // Extract header cells from the first line, filtering out empty cells that may result from leading/trailing pipes
    const headerLine = tableLines[0].trim();
    const headers = splitOnUnescapedPipes(headerLine);

    if (headers.length === 0) {
        return { table: null, nextIndex: startIndex };
    }

    // Extract data rows from remaining lines (skipping the separator line), preserving valid cell content
    const rows: string[][] = [];
    for (let i = 2; i < tableLines.length; i++) {
        const rowLine = tableLines[i].trim();
        if (rowLine.startsWith('|')) {
            const rowCells = splitOnUnescapedPipes(rowLine);

            // Include rows that contain actual content, filtering out empty rows
            if (rowCells.length > 0) {
                rows.push(rowCells);
            }
        }
    }

    const table: MarkdownBlock = {
        type: 'table',
        headers,
        rows
    };

    return { table, nextIndex: index };
}

export function parseMarkdownBlock(markdown: string) {
    const blocks: MarkdownBlock[] = [];
    const lines = markdown.split('\n');
    let index = 0;
    outer: while (index < lines.length) {
        const line = lines[index];
        index++;

        // Headers
        for (let i = 1; i <= 6; i++) {
            if (line.startsWith(`${'#'.repeat(i)} `)) {
                blocks.push({ type: 'header', level: i as 1 | 2 | 3 | 4 | 5 | 6, content: parseMarkdownSpans(line.slice(i + 1).trim(), true) });
                continue outer;
            }
        }

        // Trim
        let trimmed = line.trim();

        // Code block
        if (trimmed.startsWith('```')) {
            const language = trimmed.slice(3).trim() || null;
            let content = [];
            while (index < lines.length) {
                const nextLine = lines[index];
                if (nextLine.trim() === '```') {
                    index++;
                    break;
                }
                content.push(nextLine);
                index++;
            }
            const contentString = content.join('\n');

            // Detect mermaid diagram language and route to appropriate block type
            if (language === 'mermaid') {
                blocks.push({ type: 'mermaid', content: contentString });
            } else {
                blocks.push({ type: 'code-block', language, content: contentString });
            }
            continue;
        }

        // Horizontal rule
        if (trimmed === '---') {
            blocks.push({ type: 'horizontal-rule' });
            continue;
        }

        // Options block
        if (trimmed.startsWith('<options>')) {
            let items: string[] = [];
            while (index < lines.length) {
                const nextLine = lines[index];
                if (nextLine.trim() === '</options>') {
                    index++;
                    break;
                }
                // Extract content from <option> tags
                const optionMatch = nextLine.match(/<option>(.*?)<\/option>/);
                if (optionMatch) {
                    items.push(optionMatch[1]);
                }
                index++;
            }
            if (items.length > 0) {
                blocks.push({ type: 'options', items });
            }
            continue;
        }

        // If it is a numbered list
        const numberedListMatch = trimmed.match(/^(\d+)\.\s/);
        if (numberedListMatch) {
            let allLines = [{ number: parseInt(numberedListMatch[1]), content: trimmed.slice(numberedListMatch[0].length) }];
            while (index < lines.length) {
                const nextLine = lines[index].trim();
                const nextMatch = nextLine.match(/^(\d+)\.\s/);
                if (!nextMatch) break;
                allLines.push({ number: parseInt(nextMatch[1]), content: nextLine.slice(nextMatch[0].length) });
                index++;
            }
            blocks.push({ type: 'numbered-list', items: allLines.map((l) => ({ number: l.number, spans: parseMarkdownSpans(l.content, false) })) });
            continue;
        }

        // If it is a list
        if (trimmed.startsWith('- ')) {
            let allLines = [trimmed.slice(2)];
            while (index < lines.length && lines[index].trim().startsWith('- ')) {
                allLines.push(lines[index].trim().slice(2));
                index++;
            }
            blocks.push({ type: 'list', items: allLines.map((l) => parseMarkdownSpans(l, false)) });
            continue;
        }

        // Check for table (only if line contains unescaped pipes)
        const hasUnescapedPipe = (() => {
            let i = 0;
            while (i < trimmed.length) {
                if (trimmed[i] === '\\' && i + 1 < trimmed.length) {
                    i += 2; // Skip escaped character
                } else if (trimmed[i] === '|') {
                    return true; // Found unescaped pipe
                } else {
                    i++;
                }
            }
            return false;
        })();

        if (hasUnescapedPipe && !trimmed.startsWith('```')) {
            const { table, nextIndex } = parseTable(lines, index - 1);
            if (table) {
                blocks.push(table);
                index = nextIndex;
                continue outer;
            }
        }

        // Check for image: ![alt](url)
        const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imageMatch) {
            blocks.push({ type: 'image', alt: imageMatch[1], url: imageMatch[2] });
            continue;
        }

        // Fallback
        if (trimmed.length > 0) {
            blocks.push({ type: 'text', content: parseMarkdownSpans(trimmed, false) });
        }
    }
    return blocks;
}