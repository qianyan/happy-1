/**
 * Suggestion commands functionality for slash commands
 * Reads commands directly from session metadata storage
 */

import Fuse from 'fuse.js';
import { storage } from './storage';

export interface CommandItem {
    command: string;        // The command without slash (e.g., "compact")
    description?: string;   // Optional description of what the command does
    argumentHint?: string;  // Hint for expected arguments (e.g., "[file-pattern]")
    scope?: 'builtin' | 'project' | 'personal';  // Where the command comes from
    namespace?: string;     // Subdirectory namespace for custom commands
}

interface SearchOptions {
    limit?: number;
    threshold?: number;
}

// Commands to ignore/filter out
// Only filter commands that are truly CLI-specific or system-level
export const IGNORED_COMMANDS = [
    "add-dir",          // CLI directory management
    "config",           // CLI configuration
    "init",             // CLI initialization
    "install-github-app", // Installation specific
    "migrate-installer", // Installation specific
    "terminal-setup",   // Terminal specific
    "upgrade",          // CLI upgrade
    "logout",           // Session management
    "login"             // Session management
];

// Default commands always available
const DEFAULT_COMMANDS: CommandItem[] = [
    { command: 'compact', description: 'Compact the conversation history' },
    { command: 'clear', description: 'Clear the conversation' }
];

// Command descriptions for known tools/commands
const COMMAND_DESCRIPTIONS: Record<string, string> = {
    // Core conversation commands
    compact: 'Compact the conversation history to save context',
    clear: 'Clear the conversation and start fresh',
    reset: 'Reset the session state',

    // Development tools
    review: 'Review code for improvements and best practices',
    bug: 'Analyze code for potential bugs',
    'security-review': 'Perform security analysis on code',
    test: 'Generate or run tests',
    docs: 'Generate documentation',

    // IDE and workflow
    vim: 'Toggle vim mode in the editor',
    ide: 'Open in IDE',
    settings: 'Manage application settings',
    statusline: 'Configure status line display',

    // Session and information
    help: 'Show available commands and usage',
    status: 'Show current session status',
    cost: 'Display token usage and costs',
    memory: 'Show memory usage statistics',
    model: 'Switch or configure AI model',
    agents: 'Manage AI agents',
    resume: 'Resume a previous conversation',

    // Export and sharing
    export: 'Export conversation history',
    'pr-comments': 'Generate pull request comments',
    'release-notes': 'Generate release notes',

    // System operations
    stop: 'Stop current operation',
    abort: 'Abort current operation',
    cancel: 'Cancel current operation',
    exit: 'Exit the application',
    doctor: 'Run diagnostics',
    debug: 'Show debug information',

    // Features
    mcp: 'Manage MCP (Model Context Protocol) servers',
    permissions: 'Manage permissions',
    hooks: 'Configure hooks',
    bashes: 'Manage bash sessions',

    // Add more descriptions as commands are discovered
};

// Get commands from session metadata
function getCommandsFromSession(sessionId: string): CommandItem[] {
    const state = storage.getState();
    const session = state.sessions[sessionId];
    if (!session || !session.metadata) {
        return DEFAULT_COMMANDS.map(cmd => ({ ...cmd, scope: 'builtin' as const }));
    }

    const commands: CommandItem[] = DEFAULT_COMMANDS.map(cmd => ({ ...cmd, scope: 'builtin' as const }));

    // Track command names to avoid duplicates (custom commands take precedence)
    const commandNames = new Set(commands.map(c => c.command));

    // Add custom commands from metadata (these have rich descriptions)
    // Custom commands take precedence over SDK slash commands
    if (session.metadata.customCommands) {
        for (const customCmd of session.metadata.customCommands) {
            if (!commandNames.has(customCmd.name)) {
                commands.push({
                    command: customCmd.name,
                    description: customCmd.description,
                    argumentHint: customCmd.argumentHint,
                    scope: customCmd.scope,
                    namespace: customCmd.namespace
                });
                commandNames.add(customCmd.name);
            }
        }
    }

    // Add commands from metadata.slashCommands (filter with ignore list)
    // These come from the SDK and may not have descriptions
    if (session.metadata.slashCommands) {
        for (const cmd of session.metadata.slashCommands) {
            // Skip if in ignore list
            if (IGNORED_COMMANDS.includes(cmd)) continue;

            // Check if it's already added (custom commands take precedence)
            if (!commandNames.has(cmd)) {
                commands.push({
                    command: cmd,
                    description: COMMAND_DESCRIPTIONS[cmd],  // Use hardcoded description if available
                    scope: 'builtin'
                });
                commandNames.add(cmd);
            }
        }
    }

    return commands;
}

// Main export: search commands with fuzzy matching
export async function searchCommands(
    sessionId: string,
    query: string,
    options: SearchOptions = {}
): Promise<CommandItem[]> {
    const { limit = 10, threshold = 0.3 } = options;
    
    // Get commands from session metadata (no caching)
    const commands = getCommandsFromSession(sessionId);
    
    // If query is empty, return all commands
    if (!query || query.trim().length === 0) {
        return commands.slice(0, limit);
    }
    
    // Setup Fuse for fuzzy search
    const fuseOptions = {
        keys: [
            { name: 'command', weight: 0.7 },
            { name: 'description', weight: 0.3 }
        ],
        threshold,
        includeScore: true,
        shouldSort: true,
        minMatchCharLength: 1,
        ignoreLocation: true,
        useExtendedSearch: true
    };
    
    const fuse = new Fuse(commands, fuseOptions);
    const results = fuse.search(query, { limit });
    
    return results.map(result => result.item);
}

// Get all available commands for a session
export function getAllCommands(sessionId: string): CommandItem[] {
    return getCommandsFromSession(sessionId);
}