import React from 'react';
import { View, ScrollView, Platform } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { t } from '@/text';
import { isMacPlatform } from '@/utils/keyboard';

interface ShortcutItem {
    keys: string;
    description: string;
}

interface ShortcutGroup {
    title: string;
    shortcuts: ShortcutItem[];
}

/**
 * Gets all keyboard shortcuts organized by category.
 * Returns Mac-style shortcuts on Mac, Windows/Linux shortcuts elsewhere.
 */
function getKeyboardShortcuts(): ShortcutGroup[] {
    const isMac = isMacPlatform();
    const mod = isMac ? '⌘' : 'Ctrl';
    const shift = '⇧';
    const alt = isMac ? '⌥' : 'Alt';

    return [
        {
            title: t('keyboardShortcuts.general'),
            shortcuts: [
                { keys: `${mod}K`, description: t('keyboardShortcuts.openCommandPalette') },
                { keys: `${mod}${shift}?`, description: t('keyboardShortcuts.showKeyboardShortcuts') },
                { keys: `${mod},`, description: t('keyboardShortcuts.openSettings') },
                { keys: `${mod}B`, description: t('keyboardShortcuts.toggleSidebar') },
            ],
        },
        {
            title: t('keyboardShortcuts.sessions'),
            shortcuts: [
                { keys: `${mod}${shift}O`, description: t('keyboardShortcuts.newSession') },
                { keys: `${mod}${shift}F`, description: t('keyboardShortcuts.focusSearch') },
                { keys: isMac ? `${alt}↑` : `Ctrl+${shift}↑`, description: t('keyboardShortcuts.previousSession') },
                { keys: isMac ? `${alt}↓` : `Ctrl+${shift}↓`, description: t('keyboardShortcuts.nextSession') },
            ],
        },
        {
            title: t('keyboardShortcuts.currentSession'),
            shortcuts: [
                { keys: `${mod}${shift}V`, description: t('keyboardShortcuts.toggleVoiceRecording') },
                { keys: `${mod}${shift}A`, description: t('keyboardShortcuts.archiveSession') },
                { keys: `${mod}⌫`, description: t('keyboardShortcuts.deleteSession') },
            ],
        },
    ];
}

function ShortcutKey({ text }: { text: string }) {
    const { theme } = useUnistyles();

    return (
        <View style={[styles.keyContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
            <Text style={[styles.keyText, { color: theme.colors.text }]}>{text}</Text>
        </View>
    );
}

function ShortcutRow({ shortcut }: { shortcut: ShortcutItem }) {
    const { theme } = useUnistyles();

    return (
        <View style={styles.shortcutRow}>
            <Text style={[styles.descriptionText, { color: theme.colors.text }]}>
                {shortcut.description}
            </Text>
            <View style={styles.keysContainer}>
                <ShortcutKey text={shortcut.keys} />
            </View>
        </View>
    );
}

function ShortcutGroupSection({ group }: { group: ShortcutGroup }) {
    const { theme } = useUnistyles();

    return (
        <View style={styles.groupContainer}>
            <Text style={[styles.groupTitle, { color: theme.colors.textSecondary }]}>
                {group.title}
            </Text>
            <View style={[styles.groupContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                {group.shortcuts.map((shortcut, index) => (
                    <React.Fragment key={shortcut.keys}>
                        <ShortcutRow shortcut={shortcut} />
                        {index < group.shortcuts.length - 1 && (
                            <View style={[styles.separator, { backgroundColor: theme.colors.divider }]} />
                        )}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );
}

export interface KeyboardShortcutsPanelProps {
    onClose: () => void;
}

export function KeyboardShortcutsPanel({ onClose }: KeyboardShortcutsPanelProps) {
    const { theme } = useUnistyles();
    const shortcutGroups = getKeyboardShortcuts();

    // Only show on web
    if (Platform.OS !== 'web') {
        return null;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.groupped.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                    {t('keyboardShortcuts.title')}
                </Text>
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {shortcutGroups.map((group) => (
                    <ShortcutGroupSection key={group.title} group={group} />
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        width: 400,
        maxHeight: 500,
        borderRadius: 12,
        overflow: 'hidden',
    },
    header: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        ...Typography.default('semiBold'),
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    groupContainer: {
        marginBottom: 20,
    },
    groupTitle: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
        ...Typography.default('semiBold'),
    },
    groupContent: {
        borderRadius: 10,
        borderWidth: 1,
        overflow: 'hidden',
    },
    shortcutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    descriptionText: {
        fontSize: 14,
        flex: 1,
        ...Typography.default(),
    },
    keysContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    keyContainer: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        borderWidth: 1,
        minWidth: 28,
        alignItems: 'center',
    },
    keyText: {
        fontSize: 12,
        fontWeight: '500',
        ...Typography.default(),
    },
    separator: {
        height: 1,
        marginHorizontal: 14,
    },
}));
