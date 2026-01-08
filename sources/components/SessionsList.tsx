import React from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Text } from '@/components/StyledText';
import { usePathname } from 'expo-router';
import { SessionListViewItem, useSetting } from '@/sync/storage';
import { sessionMatchesSearch } from '@/utils/sessionSearch';
import { ActiveSessionsGroup, FlatSessionRow } from './ActiveSessionsGroup';
import { ActiveSessionsGroupCompact } from './ActiveSessionsGroupCompact';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVisibleSessionListViewData } from '@/hooks/useVisibleSessionListViewData';
import { Typography } from '@/constants/Typography';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useIsTablet } from '@/utils/responsive';
import { requestReview } from '@/utils/requestReview';
import { layout } from './layout';
import { sync } from '@/sync/sync';

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        flex: 1,
        maxWidth: layout.maxWidth,
    },
    headerSection: {
        backgroundColor: theme.colors.groupped.background,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 8,
    },
    headerText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.groupped.sectionTitle,
        letterSpacing: 0.1,
        ...Typography.default('semiBold'),
    },
    projectGroup: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: theme.colors.surface,
    },
    projectGroupTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    projectGroupSubtitle: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
        ...Typography.default(),
    },
}));

interface SessionsListProps {
    searchQuery?: string;
}

export function SessionsList({ searchQuery = '' }: SessionsListProps) {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const safeArea = useSafeAreaInsets();
    // When searching, show all sessions (including archived) regardless of hideInactiveSessions setting
    const isSearching = searchQuery.trim().length > 0;
    const rawData = useVisibleSessionListViewData({ showAllSessions: isSearching });
    const pathname = usePathname();
    const isTablet = useIsTablet();
    const compactSessionView = useSetting('compactSessionView');
    const selectable = isTablet;

    // Pull-to-refresh state
    const [refreshing, setRefreshing] = React.useState(false);
    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await sync.refreshSessions();
        } finally {
            setRefreshing(false);
        }
    }, []);

    // Filter data based on search query (local filtering)
    // Supports OR syntax with '|' separator (e.g., "foo|bar")
    const data = React.useMemo(() => {
        if (!rawData || !searchQuery.trim()) {
            return rawData;
        }

        // Filter sessions (flat list, no headers)
        const filteredItems: SessionListViewItem[] = [];

        for (const item of rawData) {
            if (item.type === 'session') {
                if (sessionMatchesSearch(item.session, searchQuery)) {
                    filteredItems.push(item);
                }
            } else if (item.type === 'active-sessions') {
                // Filter active sessions array
                const filteredSessions = item.sessions.filter(session =>
                    sessionMatchesSearch(session, searchQuery)
                );

                if (filteredSessions.length > 0) {
                    filteredItems.push({
                        ...item,
                        sessions: filteredSessions,
                    });
                }
            } else {
                // Keep other item types (project-group, etc.)
                filteredItems.push(item);
            }
        }

        return filteredItems;
    }, [rawData, searchQuery]);

    const dataWithSelected = selectable ? React.useMemo(() => {
        return data?.map(item => ({
            ...item,
            selected: pathname.startsWith(`/session/${item.type === 'session' ? item.session.id : ''}`)
        }));
    }, [data, pathname]) : data;

    // Request review
    React.useEffect(() => {
        if (data && data.length > 0) {
            requestReview();
        }
    }, [data && data.length > 0]);

    // Early return if no data yet
    if (!data) {
        return (
            <View style={styles.container} />
        );
    }

    const keyExtractor = React.useCallback((item: SessionListViewItem & { selected?: boolean }, index: number) => {
        switch (item.type) {
            case 'header': return `header-${item.title}-${index}`;
            case 'active-sessions': return 'active-sessions';
            case 'project-group': return `project-group-${item.machine.id}-${item.displayPath}-${index}`;
            case 'session': return `session-${item.session.id}`;
        }
    }, []);

    const renderItem = React.useCallback(({ item, index }: { item: SessionListViewItem & { selected?: boolean }, index: number }) => {
        switch (item.type) {
            case 'header':
                // Headers no longer used, but keeping for backward compatibility
                return (
                    <View style={styles.headerSection}>
                        <Text style={styles.headerText}>
                            {item.title}
                        </Text>
                    </View>
                );

            case 'active-sessions':
                // Extract just the session ID from pathname (e.g., /session/abc123/file -> abc123)
                let selectedId: string | undefined;
                if (isTablet && pathname.startsWith('/session/')) {
                    const parts = pathname.split('/');
                    selectedId = parts[2]; // parts[0] is empty, parts[1] is 'session', parts[2] is the ID
                }

                const ActiveComponent = compactSessionView ? ActiveSessionsGroupCompact : ActiveSessionsGroup;
                return (
                    <ActiveComponent
                        sessions={item.sessions}
                        selectedSessionId={selectedId}
                    />
                );

            case 'project-group':
                return (
                    <View style={styles.projectGroup}>
                        <Text style={styles.projectGroupTitle}>
                            {item.displayPath}
                        </Text>
                        <Text style={styles.projectGroupSubtitle}>
                            {item.machine.metadata?.displayName || item.machine.metadata?.host || item.machine.id}
                        </Text>
                    </View>
                );

            case 'session':
                return (
                    <FlatSessionRow
                        session={item.session}
                        selected={item.selected}
                    />
                );
        }
    }, [pathname, dataWithSelected, compactSessionView]);


    // Remove this section as we'll use FlatList for all items now


    const HeaderComponent = React.useCallback(() => {
        return (
            <View>
                {/* <View style={{ marginHorizontal: -4 }}>
                    <UpdateBanner />
                </View> */}
            </View>
        );
    }, []);

    // Footer removed - all sessions now shown inline

    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                <FlatList
                    data={dataWithSelected}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={{ paddingBottom: safeArea.bottom + 128, maxWidth: layout.maxWidth }}
                    ListHeaderComponent={HeaderComponent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.textSecondary}
                        />
                    }
                />
            </View>
        </View>
    );
}

