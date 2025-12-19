import React, { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { useRouter, useSegments, useGlobalSearchParams } from 'expo-router';
import { Modal } from '@/modal';
import { CommandPalette } from './CommandPalette';
import { Command } from './types';
import { useGlobalKeyboard } from '@/hooks/useGlobalKeyboard';
import { useAuth } from '@/auth/AuthContext';
import { storage, useSession } from '@/sync/storage';
import { useShallow } from 'zustand/react/shallow';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';
import { sessionKill, sessionDelete } from '@/sync/ops';
import { t } from '@/text';
import { getSessionName } from '@/utils/sessionUtils';

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { logout } = useAuth();
    const sessions = storage(useShallow((state) => state.sessions));
    const commandPaletteEnabled = storage(useShallow((state) => state.localSettings.commandPaletteEnabled));
    const navigateToSession = useNavigateToSession();

    // Get current route info to determine if we're on a session page
    const segments = useSegments();
    const params = useGlobalSearchParams<{ id: string }>();

    // Check if we're on a session page (route: session/[id])
    const isOnSessionPage = (segments as string[]).includes('session') && params.id;
    const currentSessionId = isOnSessionPage ? params.id : null;
    const currentSession = useSession(currentSessionId ?? '');

    // Define available commands
    const commands = useMemo((): Command[] => {
        const cmds: Command[] = [
            // Navigation commands
            {
                id: 'new-session',
                title: 'New Session',
                subtitle: 'Start a new chat session',
                icon: 'add-circle-outline',
                category: 'Sessions',
                shortcut: '⌘⇧O',
                action: () => {
                    router.push('/new');
                }
            },
            {
                id: 'sessions',
                title: 'View All Sessions',
                subtitle: 'Browse your chat history',
                icon: 'chatbubbles-outline',
                category: 'Sessions',
                action: () => {
                    router.push('/');
                }
            },
            {
                id: 'settings',
                title: 'Settings',
                subtitle: 'Configure your preferences',
                icon: 'settings-outline',
                category: 'Navigation',
                shortcut: '⌘,',
                action: () => {
                    router.push('/settings');
                }
            },
            {
                id: 'account',
                title: 'Account',
                subtitle: 'Manage your account',
                icon: 'person-circle-outline',
                category: 'Navigation',
                action: () => {
                    router.push('/settings/account');
                }
            },
            {
                id: 'connect',
                title: 'Connect Device',
                subtitle: 'Connect a new device via web',
                icon: 'link-outline',
                category: 'Navigation',
                action: () => {
                    router.push('/terminal/connect');
                }
            },
        ];

        // Add session-specific commands
        const recentSessions = Object.values(sessions)
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 5);

        recentSessions.forEach(session => {
            const sessionName = session.metadata?.name || `Session ${session.id.slice(0, 6)}`;
            cmds.push({
                id: `session-${session.id}`,
                title: sessionName,
                subtitle: session.metadata?.path || 'Switch to session',
                icon: 'time-outline',
                category: 'Recent Sessions',
                action: () => {
                    navigateToSession(session.id);
                }
            });
        });

        // Current session commands (only show when on a session page)
        if (currentSession && currentSessionId) {
            const sessionName = getSessionName(currentSession);

            // Archive session (only for active/connected sessions)
            if (currentSession.active) {
                cmds.push({
                    id: 'archive-session',
                    title: t('sessionInfo.archiveSession'),
                    subtitle: `${sessionName} - ${t('sessionInfo.archiveSessionSubtitle')}`,
                    icon: 'archive-outline',
                    category: 'Current Session',
                    shortcut: '⌘⇧A',
                    action: () => {
                        Modal.alert(
                            t('sessionInfo.archiveSession'),
                            t('sessionInfo.archiveSessionConfirm'),
                            [
                                { text: t('common.cancel'), style: 'cancel' },
                                {
                                    text: t('sessionInfo.archiveSession'),
                                    style: 'destructive',
                                    onPress: async () => {
                                        const result = await sessionKill(currentSessionId);
                                        if (!result.success) {
                                            Modal.alert(t('common.error'), result.message || t('sessionInfo.failedToArchiveSession'));
                                        }
                                    }
                                }
                            ]
                        );
                    }
                });
            }

            // Delete session (only for inactive sessions)
            if (!currentSession.active) {
                cmds.push({
                    id: 'delete-session',
                    title: t('sessionInfo.deleteSession'),
                    subtitle: `${sessionName} - ${t('sessionInfo.deleteSessionSubtitle')}`,
                    icon: 'trash-outline',
                    category: 'Current Session',
                    shortcut: '⌘⌫',
                    action: () => {
                        Modal.alert(
                            t('sessionInfo.deleteSession'),
                            t('sessionInfo.deleteSessionWarning'),
                            [
                                { text: t('common.cancel'), style: 'cancel' },
                                {
                                    text: t('sessionInfo.deleteSession'),
                                    style: 'destructive',
                                    onPress: async () => {
                                        const result = await sessionDelete(currentSessionId);
                                        if (result.success) {
                                            router.replace('/');
                                        } else {
                                            Modal.alert(t('common.error'), result.message || t('sessionInfo.failedToDeleteSession'));
                                        }
                                    }
                                }
                            ]
                        );
                    }
                });
            }
        }

        // System commands
        cmds.push({
            id: 'sign-out',
            title: 'Sign Out',
            subtitle: 'Sign out of your account',
            icon: 'log-out-outline',
            category: 'System',
            action: async () => {
                await logout();
            }
        });

        // Dev commands (if in development)
        if (__DEV__) {
            cmds.push({
                id: 'dev-menu',
                title: 'Developer Menu',
                subtitle: 'Access developer tools',
                icon: 'code-slash-outline',
                category: 'Developer',
                action: () => {
                    router.push('/dev');
                }
            });
        }

        return cmds;
    }, [router, logout, sessions, currentSession, currentSessionId, navigateToSession]);

    const showCommandPalette = useCallback(() => {
        if (Platform.OS !== 'web' || !commandPaletteEnabled) return;

        Modal.show({
            component: CommandPalette,
            props: {
                commands,
            }
        } as any);
    }, [commands, commandPaletteEnabled]);

    // Handler for new session shortcut (⌘⇧O)
    const handleNewSession = useCallback(() => {
        if (Platform.OS !== 'web' || !commandPaletteEnabled) return;
        router.push('/new');
    }, [router, commandPaletteEnabled]);

    // Handler for archive session shortcut (⌘⇧A)
    const handleArchiveSession = useCallback(() => {
        if (Platform.OS !== 'web' || !commandPaletteEnabled) return;
        if (!currentSession || !currentSessionId || !currentSession.active) return;

        Modal.alert(
            t('sessionInfo.archiveSession'),
            t('sessionInfo.archiveSessionConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('sessionInfo.archiveSession'),
                    style: 'destructive',
                    onPress: async () => {
                        const result = await sessionKill(currentSessionId);
                        if (!result.success) {
                            Modal.alert(t('common.error'), result.message || t('sessionInfo.failedToArchiveSession'));
                        }
                    }
                }
            ]
        );
    }, [currentSession, currentSessionId, commandPaletteEnabled]);

    // Handler for delete session shortcut (⌘⌫)
    const handleDeleteSession = useCallback(() => {
        if (Platform.OS !== 'web' || !commandPaletteEnabled) return;
        if (!currentSession || !currentSessionId || currentSession.active) return;

        Modal.alert(
            t('sessionInfo.deleteSession'),
            t('sessionInfo.deleteSessionWarning'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('sessionInfo.deleteSession'),
                    style: 'destructive',
                    onPress: async () => {
                        const result = await sessionDelete(currentSessionId);
                        if (result.success) {
                            router.replace('/');
                        } else {
                            Modal.alert(t('common.error'), result.message || t('sessionInfo.failedToDeleteSession'));
                        }
                    }
                }
            ]
        );
    }, [currentSession, currentSessionId, router, commandPaletteEnabled]);

    // Keyboard shortcut handlers
    const keyboardHandlers = useMemo(() => ({
        onNewSession: handleNewSession,
        onArchiveSession: handleArchiveSession,
        onDeleteSession: handleDeleteSession,
    }), [handleNewSession, handleArchiveSession, handleDeleteSession]);

    // Set up global keyboard handler only if feature is enabled
    useGlobalKeyboard(
        commandPaletteEnabled ? showCommandPalette : () => {},
        commandPaletteEnabled ? keyboardHandlers : undefined
    );

    return <>{children}</>;
}