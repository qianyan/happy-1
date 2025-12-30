import * as React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { UserTextMessage } from '@/sync/typesMessage';
import { Typography } from '@/constants/Typography';
import { t } from '@/text';
import * as Clipboard from 'expo-clipboard';

interface UserMessageHistoryProps {
    messages: UserTextMessage[];
    sessionId?: string;
}

/**
 * Component to display user message history above the input field
 * Shows last message by default with option to expand and see all user messages
 */
export const UserMessageHistory = React.memo<UserMessageHistoryProps>((props) => {
    const { theme } = useUnistyles();
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [selectedMessage, setSelectedMessage] = React.useState<UserTextMessage | null>(null);

    // Get only user messages (already sorted newest first from parent)
    const userMessages = React.useMemo(() => {
        return props.messages.filter(m => m.kind === 'user-text');
    }, [props.messages]);

    // If no user messages, don't render anything
    if (userMessages.length === 0) {
        return null;
    }

    const lastMessage = userMessages[0];
    const messageCount = userMessages.length;

    // Format relative time
    const formatTime = (timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return t('time.justNow');
        if (minutes < 60) return t('time.minutesAgo', { count: minutes });
        if (hours < 24) return t('time.hoursAgo', { count: hours });
        return t('time.daysAgo', { count: days });
    };

    // Truncate message text
    const truncateMessage = (text: string, maxLength: number = 60): string => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    return (
        <>
            <View style={styles.container}>
                {/* Collapsed state - shows last message */}
                {!isExpanded && (
                    <TouchableOpacity
                        style={styles.collapsedBar}
                        onPress={() => setIsExpanded(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.collapsedContent}>
                            <View style={styles.collapsedLeft}>
                                <View style={styles.labelRow}>
                                    <Ionicons
                                        name="chatbubble-outline"
                                        size={14}
                                        color={theme.colors.textSecondary}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={styles.lastLabel}>
                                        {t('agentInput.userHistory.last')}:
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        setSelectedMessage(lastMessage);
                                    }}
                                    activeOpacity={0.7}
                                    style={{ flex: 1 }}
                                >
                                    <Text style={styles.messageText} numberOfLines={3}>
                                        {lastMessage.text}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.collapsedRight}>
                                {messageCount > 1 && (
                                    <Text style={styles.countBadge}>
                                        +{messageCount - 1}
                                    </Text>
                                )}
                                <Ionicons
                                    name="chevron-up"
                                    size={16}
                                    color={theme.colors.textSecondary}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Expanded state - shows all messages */}
                {isExpanded && (
                    <View style={styles.expandedContainer}>
                        <View style={styles.expandedHeader}>
                            <View style={styles.expandedHeaderLeft}>
                                <Ionicons
                                    name="chatbubbles"
                                    size={14}
                                    color={theme.colors.text}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.expandedTitle}>
                                    {t('agentInput.userHistory.title', { count: messageCount })}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsExpanded(false)}
                                style={styles.collapseButton}
                                activeOpacity={0.7}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons
                                    name="chevron-down"
                                    size={16}
                                    color={theme.colors.text}
                                />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.messagesList}
                            contentContainerStyle={styles.messagesListContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {userMessages.map((msg, index) => (
                                <TouchableOpacity
                                    key={msg.id}
                                    style={[
                                        styles.messageRow,
                                        index === 0 && styles.messageRowFirst
                                    ]}
                                    onPress={() => setSelectedMessage(msg)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.messageRowLeft}>
                                        <Text style={styles.messageIndex}>
                                            {index + 1}/{messageCount}
                                        </Text>
                                        <Text style={styles.messageRowText} numberOfLines={1}>
                                            {msg.text}
                                        </Text>
                                    </View>
                                    <View style={styles.messageRowRight}>
                                        <Text style={styles.messageTime}>
                                            {formatTime(msg.createdAt)}
                                        </Text>
                                        <Ionicons
                                            name="eye-outline"
                                            size={14}
                                            color={theme.colors.textSecondary}
                                            style={{ marginLeft: 6 }}
                                        />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>

            {/* Full message modal */}
            {selectedMessage && (
                <Modal
                    visible={true}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setSelectedMessage(null)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setSelectedMessage(null)}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={(e) => e.stopPropagation()}
                            style={styles.modalContent}
                        >
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {t('agentInput.userHistory.fullMessage')}
                                </Text>
                                <View style={styles.modalHeaderButtons}>
                                    <TouchableOpacity
                                        onPress={async () => {
                                            await Clipboard.setStringAsync(selectedMessage.text);
                                        }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        style={styles.copyButton}
                                    >
                                        <Ionicons
                                            name="copy-outline"
                                            size={20}
                                            color={theme.colors.text}
                                        />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setSelectedMessage(null)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons
                                            name="close"
                                            size={20}
                                            color={theme.colors.text}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <ScrollView style={styles.modalBody}>
                                <Text style={styles.modalMessageText} selectable={true}>
                                    {selectedMessage.text}
                                </Text>
                                <Text style={styles.modalTimestamp}>
                                    {new Date(selectedMessage.createdAt).toLocaleString()}
                                </Text>
                            </ScrollView>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>
            )}
        </>
    );
});

UserMessageHistory.displayName = 'UserMessageHistory';

const styles = StyleSheet.create((theme) => ({
    container: {
        marginBottom: 4,
    },
    collapsedBar: {
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    collapsedContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    collapsedLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
        minWidth: 0,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
        flexShrink: 0,
    },
    collapsedRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 10,
        flexShrink: 0,
    },
    lastLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        ...Typography.default('semiBold'),
    },
    messageText: {
        fontSize: 12,
        color: theme.colors.text,
        flex: 1,
        ...Typography.default(),
    },
    countBadge: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        backgroundColor: theme.colors.surfaceHigh,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 10,
        ...Typography.default('semiBold'),
    },
    expandedContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        maxHeight: 200,
    },
    expandedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    expandedHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    expandedTitle: {
        fontSize: 13,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    collapseButton: {
        padding: 2,
    },
    messagesList: {
        flex: 1,
    },
    messagesListContent: {
        paddingVertical: 4,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    messageRowFirst: {
        backgroundColor: theme.dark ? 'rgba(33, 150, 243, 0.08)' : 'rgba(33, 150, 243, 0.04)',
    },
    messageRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
        gap: 10,
    },
    messageRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
        flexShrink: 0,
    },
    messageIndex: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
        minWidth: 40,
        flexShrink: 0,
    },
    messageRowText: {
        fontSize: 12,
        color: theme.colors.text,
        flex: 1,
        ...Typography.default(),
    },
    messageTime: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80%',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
            web: {
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
            },
        }),
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    modalHeaderButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    copyButton: {
        padding: 4,
    },
    modalBody: {
        padding: 16,
    },
    modalMessageText: {
        fontSize: 13,
        color: theme.colors.text,
        lineHeight: 20,
        ...Typography.default(),
    },
    modalTimestamp: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 12,
        ...Typography.default(),
    },
}));
