import React, { useState, useMemo, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ItemGroup } from '@/components/ItemGroup';
import { Item } from '@/components/Item';
import { Typography } from '@/constants/Typography';
import { useAllMachines, useProfile } from '@/sync/storage';
import { Ionicons } from '@expo/vector-icons';
import { isMachineOnline } from '@/utils/machineUtils';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { layout } from '@/components/layout';
import { t } from '@/text';
import { callbacks } from '../index';
import { ItemList } from '@/components/ItemList';
import { getServerUrl } from '@/sync/serverConfig';
import { MultiTextInput, MultiTextInputHandle } from '@/components/MultiTextInput';

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    contentWrapper: {
        width: '100%',
        maxWidth: layout.maxWidth,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    searchInput: {
        flex: 1,
        backgroundColor: theme.colors.input.background,
        borderRadius: 10,
        paddingHorizontal: 12,
        minHeight: 36,
        position: 'relative',
        borderWidth: 0.5,
        borderColor: theme.colors.divider,
    },
    searchInputInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInputText: {
        flex: 1,
    },
    clearButton: {
        padding: 4,
        marginLeft: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        ...Typography.default(),
    },
    emptyHelpText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        ...Typography.default(),
    },
    diagnosticBox: {
        marginTop: 24,
        marginHorizontal: 20,
        padding: 16,
        backgroundColor: theme.colors.surfaceHigh,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    diagnosticTitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 8,
        ...Typography.default('semiBold'),
    },
    diagnosticText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        ...Typography.default(),
    },
    diagnosticCode: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontFamily: 'monospace',
        marginTop: 4,
    },
    offlineWarning: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        padding: 16,
        backgroundColor: theme.colors.box.warning.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.box.warning.border,
    },
    offlineWarningTitle: {
        fontSize: 14,
        color: theme.colors.box.warning.text,
        marginBottom: 8,
        ...Typography.default('semiBold'),
    },
    offlineWarningText: {
        fontSize: 13,
        color: theme.colors.box.warning.text,
        lineHeight: 20,
        marginBottom: 4,
        ...Typography.default(),
    },
}));

export default function MachinePickerScreen() {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const router = useRouter();
    const params = useLocalSearchParams<{ selectedId?: string }>();
    const machines = useAllMachines();
    const profile = useProfile();
    const serverUrl = getServerUrl();
    const inputRef = useRef<MultiTextInputHandle>(null);

    const [searchQuery, setSearchQuery] = useState('');

    // Auto-focus the input when the screen gains focus
    useFocusEffect(
        React.useCallback(() => {
            // Small delay to ensure the screen is fully mounted
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }, [])
    );

    // Filter machines based on search query
    const filteredMachines = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return machines;

        return machines.filter(machine => {
            const displayName = machine.metadata?.displayName || '';
            const hostName = machine.metadata?.host || '';
            const machineId = machine.id || '';

            return displayName.toLowerCase().includes(query) ||
                   hostName.toLowerCase().includes(query) ||
                   machineId.toLowerCase().includes(query);
        });
    }, [machines, searchQuery]);

    const handleSelectMachine = (machineId: string) => {
        // Dismiss back to /new with the selected machine ID as a param
        // dismissTo unwinds the stack to the target route instead of pushing
        router.dismissTo({
            pathname: '/new',
            params: { selectedMachineId: machineId }
        });
    };

    // Handle keyboard events in search input
    const handleKeyPress = React.useCallback((event: { key: string; shiftKey: boolean }) => {
        // Enter - Select the first available machine (if any)
        if (event.key === 'Enter') {
            if (filteredMachines.length > 0) {
                handleSelectMachine(filteredMachines[0].id);
            }
            return true; // Handled - prevent newline
        }

        // Tab - Autocomplete with first available machine name
        if (event.key === 'Tab' && !event.shiftKey) {
            if (filteredMachines.length > 0) {
                const firstMachine = filteredMachines[0];
                const displayName = firstMachine.metadata?.displayName || firstMachine.metadata?.host || firstMachine.id;
                setSearchQuery(displayName);
                return true; // Handled - prevent default tab behavior
            }
        }

        return false; // Not handled
    }, [filteredMachines, handleSelectMachine]);

    if (machines.length === 0) {
        // Show detailed diagnostic info when no machines are found
        const accountDisplay = profile.username || profile.id.slice(0, 12) + '...';

        return (
            <>
                <Stack.Screen
                    options={{
                        headerShown: true,
                        headerTitle: 'Select Machine',
                        headerBackTitle: t('common.back')
                    }}
                />
                <View style={styles.container}>
                    <View style={styles.emptyContainer}>
                        <Ionicons
                            name="desktop-outline"
                            size={48}
                            color={theme.colors.textSecondary}
                            style={{ marginBottom: 16, opacity: 0.5 }}
                        />
                        <Text style={styles.emptyText}>
                            {t('newSession.noMachinesFound')}
                        </Text>
                        <Text style={styles.emptyHelpText}>
                            {t('newSession.noMachinesFoundHelp')}
                        </Text>

                        <View style={styles.diagnosticBox}>
                            <Text style={styles.diagnosticTitle}>
                                {t('newSession.noMachinesTroubleshoot')}
                            </Text>
                            <Text style={styles.diagnosticText}>
                                {t('newSession.noMachinesTip1')}
                            </Text>
                            <Text style={styles.diagnosticText}>
                                {t('newSession.noMachinesTip2')}
                            </Text>
                            <Text style={styles.diagnosticText}>
                                {t('newSession.noMachinesTip3')}
                            </Text>
                            <Text style={[styles.diagnosticCode, { marginTop: 12 }]}>
                                Account: {accountDisplay}
                            </Text>
                            <Text style={styles.diagnosticCode}>
                                Server: {serverUrl}
                            </Text>
                        </View>
                    </View>
                </View>
            </>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: 'Select Machine',
                    headerBackTitle: t('common.back')
                }}
            />
            <ItemList>
                {/* Search input */}
                <ItemGroup title={t('machine.searchMachines')}>
                    <View style={styles.searchInputContainer}>
                        <View style={[styles.searchInput, { paddingVertical: 8 }]}>
                            <View style={styles.searchInputInner}>
                                <View style={styles.searchInputText}>
                                    <MultiTextInput
                                        ref={inputRef}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder={t('machine.searchByNameOrHostname')}
                                        maxHeight={76}
                                        paddingTop={8}
                                        paddingBottom={8}
                                        onKeyPress={handleKeyPress}
                                    />
                                </View>
                                {searchQuery.length > 0 && (
                                    <Pressable
                                        onPress={() => {
                                            setSearchQuery('');
                                            inputRef.current?.focus();
                                        }}
                                        style={styles.clearButton}
                                        hitSlop={8}
                                    >
                                        <Ionicons
                                            name="close-circle"
                                            size={18}
                                            color={theme.colors.textSecondary}
                                        />
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    </View>
                </ItemGroup>

                {filteredMachines.length === 0 && searchQuery && (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {t('machine.noMachinesMatchingSearch', { searchQuery })}
                        </Text>
                    </View>
                )}

                {filteredMachines.length === 0 && !searchQuery && (
                    <View style={styles.offlineWarning}>
                        <Text style={styles.offlineWarningTitle}>
                            All machines offline
                        </Text>
                        <View style={{ marginTop: 4 }}>
                            <Text style={styles.offlineWarningText}>
                                {t('machine.offlineHelp')}
                            </Text>
                        </View>
                    </View>
                )}

                {filteredMachines.length > 0 && (
                    <ItemGroup title={searchQuery ? t('machine.searchResults') : t('machine.availableMachines')}>
                        {filteredMachines.map((machine, index) => {
                            const displayName = machine.metadata?.displayName || machine.metadata?.host || machine.id;
                            const hostName = machine.metadata?.host || machine.id;
                            const offline = !isMachineOnline(machine);
                            const isSelected = params.selectedId === machine.id;
                            const isFirst = index === 0;

                            return (
                                <Item
                                    key={machine.id}
                                    title={displayName}
                                    subtitle={displayName !== hostName ? hostName : undefined}
                                    leftElement={
                                        <Ionicons
                                            name="desktop-outline"
                                            size={24}
                                            color={offline ? theme.colors.textSecondary : theme.colors.text}
                                        />
                                    }
                                    detail={offline ? 'offline' : 'online'}
                                    detailStyle={{
                                        color: offline ? theme.colors.status.disconnected : theme.colors.status.connected
                                    }}
                                    titleStyle={{
                                        color: offline ? theme.colors.textSecondary : theme.colors.text
                                    }}
                                    subtitleStyle={{
                                        color: theme.colors.textSecondary
                                    }}
                                    selected={isSelected || (!!searchQuery && isFirst)}
                                    onPress={() => handleSelectMachine(machine.id)}
                                    showChevron={false}
                                    pressableStyle={(isSelected || (searchQuery && isFirst)) ? { backgroundColor: theme.colors.surfaceSelected } : undefined}
                                />
                            );
                        })}
                    </ItemGroup>
                )}
            </ItemList>
        </>
    );
}