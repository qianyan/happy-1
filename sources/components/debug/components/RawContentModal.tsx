import * as React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { JsonRenderer } from '../renderers';

interface RawContentModalProps {
    visible: boolean;
    onClose: () => void;
    content: any;
    title: string;
}

/**
 * Full-screen modal for displaying raw content
 */
export const RawContentModal = React.memo<RawContentModalProps>((props) => {
    const { visible, onClose, content, title } = props;
    const { theme } = useUnistyles();


    // Check if this is a tool-call message with input and output
    const isToolCall = content && typeof content === 'object' && content.kind === 'tool-call' && content.tool;

    const sections = React.useMemo(() => {
        const result: Array<{ title: string; data: any; isJson: boolean }> = [];

        // For tool-call messages, show BOTH the tool use and tool result API messages
        if (content && content.kind === 'tool-call' && content.tool) {
            // 1. Tool Use (Assistant calling the tool)
            if (content.apiMessage) {
                result.push({
                    title: 'TOOL USE - Claude API Request',
                    data: content.apiMessage,
                    isJson: true,
                });
            }

            // 2. Tool Result (User message with the result)
            if (content.tool.resultApiMessage) {
                result.push({
                    title: 'TOOL RESULT - Claude API Response',
                    data: content.tool.resultApiMessage,
                    isJson: true,
                });
            }

            if (result.length > 0) {
                return result;
            }
        }

        // For other messages with apiMessage, show it
        if (content && content.apiMessage) {
            return [{
                title: 'CLAUDE API MESSAGE',
                data: content.apiMessage,
                isJson: true,
            }];
        }

        // Fallback for old messages without apiMessage: try to reconstruct API format
        if (content && typeof content === 'object') {
            // User text message
            if (content.kind === 'user-text' && content.text) {
                const apiFormat = {
                    role: 'user',
                    content: content.text
                };
                return [{
                    title: 'CLAUDE API FORMAT (reconstructed)',
                    data: apiFormat,
                    isJson: true,
                }];
            }
        }

        // Final fallback: show the content as-is
        return [{
            title: 'RAW CONTENT',
            data: content,
            isJson: typeof content === 'object',
        }];
    }, [content]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View
                style={{
                    flex: 1,
                    backgroundColor: theme.colors.surface,
                }}
            >
                {/* Header */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.divider,
                        backgroundColor: theme.colors.surfaceHigh,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: '600',
                                color: theme.colors.text,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                            }}
                        >
                            RAW DATA
                        </Text>
                        <Text
                            style={{
                                fontSize: 11,
                                color: theme.colors.textSecondary,
                                marginTop: 2,
                            }}
                        >
                            {title}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={onClose}
                        style={{
                            padding: 8,
                            borderRadius: 6,
                            backgroundColor: theme.colors.surface,
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16 }}
                >
                    {sections.map((section, index) => (
                        <View key={index} style={{ marginBottom: index < sections.length - 1 ? 24 : 0 }}>
                            {/* Section header */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginBottom: 8,
                                    paddingBottom: 6,
                                    borderBottomWidth: 1,
                                    borderBottomColor: theme.colors.divider,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 10,
                                        fontWeight: '700',
                                        color: theme.colors.text,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.8,
                                    }}
                                >
                                    {section.title}
                                </Text>
                            </View>

                            {/* Section content */}
                            {section.isJson ? (
                                <JsonRenderer
                                    content={JSON.stringify(section.data)}
                                    theme="dark"
                                />
                            ) : (
                                <Text
                                    style={{
                                        fontSize: 11,
                                        lineHeight: 16,
                                        color: theme.colors.text,
                                        fontFamily: Platform.select({
                                            ios: 'Menlo',
                                            android: 'monospace',
                                            default: 'monospace',
                                        }),
                                    }}
                                    selectable
                                >
                                    {typeof section.data === 'string' ? section.data : JSON.stringify(section.data, null, 2)}
                                </Text>
                            )}
                        </View>
                    ))}
                </ScrollView>
            </View>
        </Modal>
    );
});

RawContentModal.displayName = 'RawContentModal';
