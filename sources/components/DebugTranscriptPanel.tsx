import * as React from 'react';
import { View, Text, FlatList, TouchableOpacity, Platform } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Message } from '@/sync/typesMessage';
import { Metadata } from '@/sync/storageTypes';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/text';
import { DebugContentRenderer } from '@/components/debug';
import { RawContentModal } from '@/components/debug/components/RawContentModal';
import { ScrollView } from 'react-native'; // Keep for horizontal filter scroll

interface DebugTranscriptPanelProps {
    messages: Message[];
    metadata: Metadata | null;
    selectedMessageId: string | null;
    onScrollToMessage?: (messageId: string) => void;
}

export const DebugTranscriptPanel = React.memo<DebugTranscriptPanelProps>((props) => {
    const { theme } = useUnistyles();
    const flatListRef = React.useRef<FlatList<Message>>(null);
    const [allExpanded, setAllExpanded] = React.useState(true);
    const [visibleTypes, setVisibleTypes] = React.useState<Set<string>>(new Set());
    const [isUserScrolling, setIsUserScrolling] = React.useState(false);
    const scrollTimeoutRef = React.useRef<number | null>(null);
    const initialScrollDone = React.useRef(false);

    // Auto-scroll to bottom on initial load
    React.useEffect(() => {
        if (props.messages.length > 0 && !initialScrollDone.current) {
            // Wait for layout to complete, then scroll to end
            const timer = setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
                initialScrollDone.current = true;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [props.messages.length]);

    // Get message type for checking if message is filtered
    const getMessageType = (message: Message): string => {
        if (message.kind === 'tool-call' && message.tool?.name) {
            return message.tool.name;
        }
        return message.kind;
    };

    // Check if a message is currently visible (not filtered out)
    const isMessageVisible = React.useCallback((messageId: string) => {
        const message = props.messages.find(m => m.id === messageId);
        if (!message) return false;

        // If no filters active, all messages are visible
        if (visibleTypes.size === 0) return true;

        // Check if message type is not in the hidden set
        const type = getMessageType(message);
        return !visibleTypes.has(type);
    }, [props.messages, visibleTypes]);

    // Track user scrolling
    const handleScrollBegin = React.useCallback(() => {
        setIsUserScrolling(true);
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
    }, []);

    const handleScrollEnd = React.useCallback(() => {
        // Reset user scrolling flag after a delay
        scrollTimeoutRef.current = setTimeout(() => {
            setIsUserScrolling(false);
        }, 1000) as unknown as number;
    }, []);

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    // Reverse messages to show in chronological order (oldest first)
    const orderedMessages = React.useMemo(() => {
        return [...props.messages].reverse();
    }, [props.messages]);

    // Calculate type counts and collect unique tool types
    const typeCounts = React.useMemo(() => {
        const counts = new Map<string, number>();
        props.messages.forEach(message => {
            if (message.kind === 'tool-call' && message.tool?.name) {
                const toolName = message.tool.name;
                counts.set(toolName, (counts.get(toolName) || 0) + 1);
            } else {
                counts.set(message.kind, (counts.get(message.kind) || 0) + 1);
            }
        });
        return counts;
    }, [props.messages]);

    // Toggle type visibility
    const toggleTypeVisibility = React.useCallback((type: string) => {
        setVisibleTypes(prev => {
            const next = new Set(prev);
            if (next.has(type)) {
                next.delete(type);
            } else {
                next.add(type);
            }
            return next;
        });
    }, []);

    // Toggle between show all and hide all
    const toggleShowAll = React.useCallback(() => {
        if (visibleTypes.size === typeCounts.size) {
            // Currently all hidden, show all
            setVisibleTypes(new Set());
        } else {
            // Show some or all, hide all
            setVisibleTypes(new Set(typeCounts.keys()));
        }
    }, [typeCounts, visibleTypes]);

    // Filter messages based on visible types
    const filteredMessages = React.useMemo(() => {
        if (visibleTypes.size === 0) {
            return orderedMessages; // Show all if no filters active
        }
        return orderedMessages.filter(message => {
            const type = getMessageType(message);
            return !visibleTypes.has(type); // Hide if type is in visibleTypes (toggled off)
        });
    }, [orderedMessages, visibleTypes]);

    // Scroll to top
    const scrollToTop = React.useCallback(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, []);

    // Scroll to bottom - use scrollToIndex for more reliable scrolling with variable height items
    const scrollToBottom = React.useCallback(() => {
        if (filteredMessages.length > 0) {
            flatListRef.current?.scrollToIndex({
                index: filteredMessages.length - 1,
                animated: true,
                viewPosition: 1, // Position at bottom of viewport
            });
        }
    }, [filteredMessages.length]);

    // Scroll to selected message when it changes
    React.useEffect(() => {
        if (!props.selectedMessageId || isUserScrolling) {
            return;
        }

        // Check if the message is visible (not filtered out)
        if (!isMessageVisible(props.selectedMessageId)) {
            return;
        }

        // Find the index of the selected message in the filtered list
        const index = filteredMessages.findIndex(m => m.id === props.selectedMessageId);
        if (index === -1) {
            return;
        }

        // Wait for layout to settle, then scroll
        const timeoutId = setTimeout(() => {
            flatListRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.3, // Position the item 30% from the top
            });
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [props.selectedMessageId, isUserScrolling, isMessageVisible, filteredMessages]);

    // Get background color for type button (using higher contrast solid colors)
    const getTypeButtonColor = (type: string): string => {
        // Shell/execution tools - Orange
        if (type === 'Bash') return theme.dark ? '#D84315' : '#EF6C00';

        // File reading tools - Blue
        if (type === 'Read') return theme.dark ? '#1565C0' : '#1976D2';

        // File editing tools - Purple
        if (type === 'Edit') return theme.dark ? '#6A1B9A' : '#7B1FA2';

        // File writing tools - Cyan
        if (type === 'Write') return theme.dark ? '#00838F' : '#0097A7';

        // Search tools - Pink
        if (type === 'Grep') return theme.dark ? '#C2185B' : '#D81B60';
        if (type === 'Glob') return theme.dark ? '#C2185B' : '#D81B60';

        // Task/Todo tools - Yellow/Amber
        if (type === 'Task') return theme.dark ? '#F57C00' : '#FB8C00';
        if (type === 'TodoWrite') return theme.dark ? '#F57C00' : '#FB8C00';

        // Web tools - Teal
        if (type === 'WebFetch') return theme.dark ? '#00695C' : '#00796B';
        if (type === 'WebSearch') return theme.dark ? '#00695C' : '#00796B';

        // Message kinds
        if (type === 'user-text') return theme.dark ? '#1565C0' : '#1976D2';
        if (type === 'agent-text') return theme.dark ? '#2E7D32' : '#388E3C';
        if (type === 'agent-event') return theme.dark ? '#6A1B9A' : '#7B1FA2';

        // Default for unknown tools - Gray
        return theme.dark ? '#424242' : '#616161';
    };

    // Get background style based on message type
    const getMessageBackground = React.useCallback((message: Message, isSelected: boolean) => {
        if (isSelected) {
            return styles.messageBlockSelected;
        }
        switch (message.kind) {
            case 'user-text':
                return styles.messageBlockUser;
            case 'agent-text':
                return styles.messageBlockAgent;
            case 'tool-call':
                return styles.messageBlockTool;
            case 'agent-event':
                return styles.messageBlockEvent;
            default:
                return null;
        }
    }, []);

    // FlatList keyExtractor
    const keyExtractor = React.useCallback((item: Message) => item.id, []);

    // FlatList renderItem
    const renderItem = React.useCallback(({ item, index }: { item: Message; index: number }) => {
        const isSelected = props.selectedMessageId === item.id;
        return (
            <View
                style={[
                    styles.messageBlock,
                    getMessageBackground(item, isSelected)
                ]}
            >
                <DebugMessageView
                    message={item}
                    metadata={props.metadata}
                    index={index}
                    forceExpanded={allExpanded}
                />
            </View>
        );
    }, [props.selectedMessageId, props.metadata, allExpanded, getMessageBackground]);

    // Handle scroll failure (when item hasn't been rendered yet)
    const onScrollToIndexFailed = React.useCallback((info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
        // Scroll to the closest rendered item first, then try again
        flatListRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
        });
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View>
                        <Text style={styles.headerTitle}>{t('debug.transcript')}</Text>
                        <Text style={styles.headerSubtitle}>{t('debug.transcriptSubtitle')}</Text>
                    </View>
                </View>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={scrollToTop}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="arrow-up-circle-outline"
                            size={20}
                            color={theme.colors.text}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={scrollToBottom}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="arrow-down-circle-outline"
                            size={20}
                            color={theme.colors.text}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => setAllExpanded(!allExpanded)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={allExpanded ? 'contract-outline' : 'expand-outline'}
                            size={16}
                            color={theme.colors.text}
                        />
                        <Text style={styles.toggleButtonText}>
                            {allExpanded ? t('debug.collapseAll') : t('debug.expandAll')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Type filter buttons */}
            {typeCounts.size > 0 && (
                <View style={styles.filterContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterScrollContent}
                    >
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={toggleShowAll}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={visibleTypes.size === typeCounts.size ? "eye-outline" : "close-circle"}
                                size={14}
                                color={theme.colors.text}
                            />
                            <Text style={styles.clearButtonText}>
                                {visibleTypes.size === typeCounts.size ? "Show All" : "Clear"}
                            </Text>
                        </TouchableOpacity>
                        {Array.from(typeCounts.entries())
                            .sort((a, b) => b[1] - a[1]) // Sort by count descending
                            .map(([type, count]) => {
                                const isHidden = visibleTypes.has(type);
                                return (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.filterButton,
                                            {
                                                backgroundColor: isHidden
                                                    ? theme.colors.surface
                                                    : getTypeButtonColor(type),
                                                borderColor: isHidden
                                                    ? theme.colors.divider
                                                    : 'transparent',
                                                opacity: isHidden ? 0.5 : 1,
                                            }
                                        ]}
                                        onPress={() => toggleTypeVisibility(type)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.filterButtonText,
                                            {
                                                color: isHidden ? theme.colors.text : '#FFFFFF',
                                                opacity: isHidden ? 0.6 : 1
                                            }
                                        ]}>
                                            {type} ({count})
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                    </ScrollView>
                </View>
            )}
            <FlatList
                ref={flatListRef}
                data={filteredMessages}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                onScrollBeginDrag={handleScrollBegin}
                onScrollEndDrag={handleScrollEnd}
                onMomentumScrollEnd={handleScrollEnd}
                onScrollToIndexFailed={onScrollToIndexFailed}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={Platform.OS !== 'web'}
                initialNumToRender={30}
                maxToRenderPerBatch={20}
                windowSize={11}
            />
        </View>
    );
});

const DebugMessageView = React.memo<{
    message: Message;
    metadata: Metadata | null;
    index: number;
    forceExpanded: boolean;
}>((props) => {
    const { message } = props;

    switch (message.kind) {
        case 'user-text':
            return <UserTextDebugView message={message} index={props.index} />;
        case 'agent-text':
            return <AgentTextDebugView message={message} index={props.index} />;
        case 'tool-call':
            return <ToolCallDebugView message={message} index={props.index} forceExpanded={props.forceExpanded} />;
        case 'agent-event':
            return <AgentEventDebugView message={message} index={props.index} />;
        case 'thinking':
            return <ThinkingDebugView message={message} index={props.index} />;
        case 'sub-agent-invocation':
            return <SubAgentInvocationDebugView message={message} index={props.index} />;
        default:
            return null;
    }
});

function UserTextDebugView(props: { message: any; index: number }) {
    const [showRaw, setShowRaw] = React.useState(false);

    return (
        <View>
            <DebugHeader
                type="USER"
                index={props.index}
                timestamp={props.message.createdAt}
                onPressType={() => setShowRaw(true)}
            />
            <DebugContentRenderer content={props.message.text} compact={false} />
            <RawContentModal
                visible={showRaw}
                onClose={() => setShowRaw(false)}
                content={props.message}
                title="User Message"
            />
        </View>
    );
}

function AgentTextDebugView(props: { message: any; index: number }) {
    const [showRaw, setShowRaw] = React.useState(false);

    return (
        <View>
            <DebugHeader
                type="AGENT"
                index={props.index}
                timestamp={props.message.createdAt}
                onPressType={() => setShowRaw(true)}
            />
            <DebugContentRenderer content={props.message.text} compact={false} forceRenderer="markdown" />
            <RawContentModal
                visible={showRaw}
                onClose={() => setShowRaw(false)}
                content={props.message}
                title="Agent Message"
            />
        </View>
    );
}

function ToolCallDebugView(props: { message: any; index: number; forceExpanded: boolean }) {
    const { theme } = useUnistyles();
    const [inputExpanded, setInputExpanded] = React.useState(true);
    const [outputExpanded, setOutputExpanded] = React.useState(true);
    const [showRaw, setShowRaw] = React.useState(false);

    // Sync local state with global toggle
    React.useEffect(() => {
        setInputExpanded(props.forceExpanded);
        setOutputExpanded(props.forceExpanded);
    }, [props.forceExpanded]);

    const tool = props.message.tool;
    if (!tool) return null;

    // Get string representation for preview
    const getContentPreview = (content: any): string => {
        // For objects, stringify them in compact form for preview
        if (typeof content === 'object' && content !== null) {
            const compact = JSON.stringify(content);
            return compact.length > 100 ? compact.substring(0, 100) + '...' : compact;
        }

        // For strings, show first line or first 100 chars
        const str = String(content);
        const firstLine = str.split('\n')[0];
        return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
    };

    const getContentSize = (content: any): number => {
        return typeof content === 'string' ? content.length : JSON.stringify(content).length;
    };

    const isInputLong = getContentSize(tool.input) > 500;
    const isOutputLong = tool.result ? getContentSize(tool.result) > 500 : false;

    return (
        <View>
            <DebugHeader
                type="TOOL"
                index={props.index}
                timestamp={tool.createdAt}
                subtitle={tool.name}
                state={tool.state}
                onPressType={() => setShowRaw(true)}
            />
            <RawContentModal
                visible={showRaw}
                onClose={() => setShowRaw(false)}
                content={props.message}
                title={`Tool: ${tool.name}`}
            />

            {/* Tool Input */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={[
                        styles.sectionHeader,
                        {
                            backgroundColor: theme.dark ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)',
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            borderRadius: 4,
                        }
                    ]}
                    onPress={() => setInputExpanded(!inputExpanded)}
                    activeOpacity={0.7}
                >
                    <View style={styles.sectionHeaderLeft}>
                        <Ionicons
                            name={inputExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={14}
                            color={theme.colors.text}
                        />
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                            {t('debug.input')} ({getContentSize(tool.input)} chars)
                        </Text>
                    </View>
                    {!inputExpanded && (
                        <Text style={[styles.sectionPreview, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {getContentPreview(tool.input)}
                        </Text>
                    )}
                </TouchableOpacity>
                {inputExpanded && (
                    <DebugContentRenderer
                        content={tool.input}
                        type="input"
                        toolName={tool.name}
                        compact={false}
                    />
                )}
            </View>

            {/* Tool Output */}
            {tool.state === 'completed' && tool.result && (
                <View style={styles.section}>
                    <TouchableOpacity
                        style={[
                            styles.sectionHeader,
                            {
                                backgroundColor: theme.dark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)',
                                paddingHorizontal: 8,
                                paddingVertical: 6,
                                borderRadius: 4,
                            }
                        ]}
                        onPress={() => setOutputExpanded(!outputExpanded)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.sectionHeaderLeft}>
                            <Ionicons
                                name={outputExpanded ? 'chevron-down' : 'chevron-forward'}
                                size={14}
                                color={theme.colors.text}
                            />
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                {t('debug.output')} ({getContentSize(tool.result)} chars)
                            </Text>
                        </View>
                        {!outputExpanded && (
                            <Text style={[styles.sectionPreview, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                                {getContentPreview(tool.result)}
                            </Text>
                        )}
                    </TouchableOpacity>
                    {outputExpanded && (
                        <DebugContentRenderer
                            content={tool.result}
                            type="output"
                            toolName={tool.name}
                            compact={false}
                        />
                    )}
                </View>
            )}

            {/* Error state */}
            {tool.state === 'error' && tool.result && (
                <View style={styles.errorContainer}>
                    <DebugContentRenderer
                        content={tool.result}
                        type="output"
                        toolName={tool.name}
                        compact={false}
                        forceRenderer="error"
                    />
                </View>
            )}
        </View>
    );
}

function AgentEventDebugView(props: { message: any; index: number }) {
    const [showRaw, setShowRaw] = React.useState(false);
    const event = props.message.event;
    let eventText = '';

    if (event.type === 'switch') {
        eventText = `Switched to ${event.mode} mode`;
    } else if (event.type === 'message') {
        eventText = event.message;
    } else if (event.type === 'limit-reached') {
        eventText = `Usage limit reached until ${new Date(event.endsAt * 1000).toLocaleString()}`;
    } else {
        eventText = JSON.stringify(event);
    }

    return (
        <View>
            <DebugHeader
                type="EVENT"
                index={props.index}
                timestamp={props.message.createdAt}
                onPressType={() => setShowRaw(true)}
            />
            <Text style={styles.eventText}>{eventText}</Text>
            <RawContentModal
                visible={showRaw}
                onClose={() => setShowRaw(false)}
                content={props.message}
                title="Agent Event"
            />
        </View>
    );
}

function ThinkingDebugView(props: { message: any; index: number }) {
    const { theme } = useUnistyles();
    const [showRaw, setShowRaw] = React.useState(false);

    return (
        <View>
            <DebugHeader
                type="EVENT"
                index={props.index}
                timestamp={props.message.createdAt}
                subtitle="💭 Thinking"
                onPressType={() => setShowRaw(true)}
            />
            <DebugContentRenderer content={props.message.thinking} compact={false} />
            {props.message.signature && (
                <View style={[styles.section, { marginTop: 8 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                        Signature: {props.message.signature}
                    </Text>
                </View>
            )}
            <RawContentModal
                visible={showRaw}
                onClose={() => setShowRaw(false)}
                content={props.message}
                title="Thinking Block"
            />
        </View>
    );
}

function SubAgentInvocationDebugView(props: { message: any; index: number }) {
    const { theme } = useUnistyles();
    const [showRaw, setShowRaw] = React.useState(false);
    const [promptExpanded, setPromptExpanded] = React.useState(true);
    const [resultExpanded, setResultExpanded] = React.useState(true);

    return (
        <View>
            <DebugHeader
                type="TOOL"
                index={props.index}
                timestamp={props.message.createdAt}
                subtitle={`🤖 ${props.message.subagentType}`}
                onPressType={() => setShowRaw(true)}
            />

            {/* Description */}
            {props.message.description && (
                <Text style={styles.eventText}>{props.message.description}</Text>
            )}

            {/* Prompt */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={[
                        styles.sectionHeader,
                        {
                            backgroundColor: theme.dark ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)',
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            borderRadius: 4,
                        }
                    ]}
                    onPress={() => setPromptExpanded(!promptExpanded)}
                    activeOpacity={0.7}
                >
                    <View style={styles.sectionHeaderLeft}>
                        <Ionicons
                            name={promptExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={14}
                            color={theme.colors.text}
                        />
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                            Prompt
                        </Text>
                    </View>
                </TouchableOpacity>
                {promptExpanded && (
                    <DebugContentRenderer content={props.message.prompt} compact={false} />
                )}
            </View>

            {/* Result */}
            {props.message.result && (
                <View style={styles.section}>
                    <TouchableOpacity
                        style={[
                            styles.sectionHeader,
                            {
                                backgroundColor: theme.dark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)',
                                paddingHorizontal: 8,
                                paddingVertical: 6,
                                borderRadius: 4,
                            }
                        ]}
                        onPress={() => setResultExpanded(!resultExpanded)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.sectionHeaderLeft}>
                            <Ionicons
                                name={resultExpanded ? 'chevron-down' : 'chevron-forward'}
                                size={14}
                                color={theme.colors.text}
                            />
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                Result
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {resultExpanded && (
                        <DebugContentRenderer content={props.message.result} compact={false} />
                    )}
                </View>
            )}

            <RawContentModal
                visible={showRaw}
                onClose={() => setShowRaw(false)}
                content={props.message}
                title="Sub-Agent Invocation"
            />
        </View>
    );
}

function DebugHeader(props: {
    type: 'USER' | 'AGENT' | 'TOOL' | 'EVENT';
    index: number;
    timestamp: number;
    subtitle?: string;
    state?: string;
    onPressType?: () => void;
}) {
    const { theme } = useUnistyles();

    const typeColors = {
        USER: theme.colors.radio.active,
        AGENT: theme.colors.success,
        TOOL: theme.colors.warning,
        EVENT: theme.colors.textSecondary,
    };

    const typeEmojis = {
        USER: '👤',
        AGENT: '🤖',
        TOOL: '🔧',
        EVENT: '📢',
    };

    // State-specific colors
    const getStateColor = (state: string) => {
        switch (state.toLowerCase()) {
            case 'completed':
                return theme.colors.success;
            case 'error':
                return '#FF5555'; // Red color for errors
            case 'pending':
                return theme.colors.warning;
            case 'running':
                return theme.colors.radio.active;
            default:
                return theme.colors.textSecondary;
        }
    };

    const stateColor = props.state ? getStateColor(props.state) : undefined;

    return (
        <View style={styles.debugHeader}>
            <View style={styles.debugHeaderLeft}>
                <Text style={styles.debugEmoji}>
                    {typeEmojis[props.type]}
                </Text>
                <TouchableOpacity
                    onPress={props.onPressType}
                    activeOpacity={0.7}
                    style={{
                        paddingVertical: 2,
                        paddingHorizontal: 4,
                        borderRadius: 3,
                        backgroundColor: props.onPressType ? theme.colors.surface : 'transparent',
                    }}
                >
                    <Text style={[styles.debugType, { color: typeColors[props.type] }]}>
                        {props.type}
                    </Text>
                </TouchableOpacity>
                {props.state && (
                    <View style={[styles.stateBadge, { backgroundColor: stateColor + '20', borderColor: stateColor }]}>
                        <Text style={[styles.stateBadgeText, { color: stateColor }]}>
                            {props.state.toUpperCase()}
                        </Text>
                    </View>
                )}
                {props.subtitle && (
                    <Text style={styles.debugSubtitle}> · {props.subtitle}</Text>
                )}
            </View>
            <Text style={styles.debugTimestamp}>
                {new Date(props.timestamp).toLocaleTimeString()}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        backgroundColor: theme.colors.surfaceHigh,
        gap: 12,
    },
    headerLeft: {
        flex: 1,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    iconButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    toggleButtonText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.text,
        textTransform: 'uppercase',
    },
    filterContainer: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        backgroundColor: theme.colors.surfaceHigh,
        paddingVertical: 8,
    },
    filterScrollContent: {
        paddingHorizontal: 12,
        gap: 6,
        flexDirection: 'row',
    },
    filterButton: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderWidth: 1,
        minWidth: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterButtonText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.text,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    clearButton: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        minWidth: 60,
        justifyContent: 'center',
    },
    clearButtonText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.text,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 12,
    },
    messageBlock: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: theme.colors.surfaceHigh,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            },
        }),
    },
    messageBlockSelected: {
        borderWidth: 2,
        borderColor: theme.colors.radio.active,
        backgroundColor: theme.colors.surfaceHighest,
    },
    messageBlockUser: {
        backgroundColor: theme.dark
            ? 'rgba(33, 150, 243, 0.08)'  // Subtle blue tint for dark mode
            : 'rgba(33, 150, 243, 0.04)',  // Even more subtle for light mode
        borderLeftColor: theme.colors.radio.active,
    },
    messageBlockAgent: {
        backgroundColor: theme.dark
            ? 'rgba(76, 175, 80, 0.08)'   // Subtle green tint for dark mode
            : 'rgba(76, 175, 80, 0.04)',   // Even more subtle for light mode
        borderLeftColor: theme.colors.success,
    },
    messageBlockTool: {
        backgroundColor: theme.dark
            ? 'rgba(255, 152, 0, 0.08)'   // Subtle orange tint for dark mode
            : 'rgba(255, 152, 0, 0.04)',   // Even more subtle for light mode
        borderLeftColor: theme.colors.warning,
    },
    messageBlockEvent: {
        backgroundColor: theme.dark
            ? 'rgba(156, 39, 176, 0.08)'  // Subtle purple tint for dark mode
            : 'rgba(156, 39, 176, 0.04)',  // Even more subtle for light mode
        borderLeftColor: theme.colors.textSecondary,
    },
    debugHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    debugHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    debugEmoji: {
        fontSize: 12,
    },
    debugType: {
        fontSize: 10,
        fontWeight: '700',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    stateBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
    },
    stateBadgeText: {
        fontSize: 8,
        fontWeight: '700',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
        letterSpacing: 0.5,
    },
    debugSubtitle: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    debugTimestamp: {
        fontSize: 9,
        color: theme.colors.textSecondary,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    section: {
        marginTop: 6,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingVertical: 4,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    sectionPreview: {
        fontSize: 9,
        color: theme.colors.textSecondary,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
        opacity: 0.6,
        flex: 1,
        marginLeft: 8,
    },
    errorContainer: {
        marginTop: 6,
        padding: 8,
        backgroundColor: theme.colors.surfaceHigh,
        borderLeftWidth: 2,
        borderLeftColor: theme.colors.warning,
        borderRadius: 4,
    },
    eventText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
}));
