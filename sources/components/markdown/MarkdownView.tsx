import { MarkdownSpan, parseMarkdown } from './parseMarkdown';
import { parseMarkdownSpans } from './parseMarkdownSpans';
import { Link } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, View, Platform } from 'react-native';
import { LongPressGestureHandler, State } from 'react-native-gesture-handler';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Text } from '../StyledText';
import { Typography } from '@/constants/Typography';
import { SimpleSyntaxHighlighter } from '../SimpleSyntaxHighlighter';
import { Modal } from '@/modal';
import { useLocalSetting } from '@/sync/storage';
import { storeTempText } from '@/sync/persistence';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { MermaidRenderer } from './MermaidRenderer';
import { MarkdownImage } from './MarkdownImage';
import { t } from '@/text';

// Option type for callback
export type Option = {
    title: string;
};

export const MarkdownView = React.memo((props: { 
    markdown: string;
    onOptionPress?: (option: Option) => void;
}) => {
    const blocks = React.useMemo(() => parseMarkdown(props.markdown), [props.markdown]);
    
    // Backwards compatibility: The original version just returned the view, wrapping the list of blocks.
    // It made each of the individual text elements selectable. When we enable the markdownCopyV2 feature,
    // we disable the selectable property on individual text segments on mobile only. Instead, the long press
    // will be handled by a wrapper Pressable. If we don't disable the selectable property, then you will see
    // the native copy modal come up at the same time as the long press handler is fired.
    const markdownCopyV2 = useLocalSetting('markdownCopyV2');
    const selectable = Platform.OS === 'web' || !markdownCopyV2;
    const router = useRouter();

    const handleLongPressGesture = React.useCallback((event: { nativeEvent: { state: number } }) => {
        if (event.nativeEvent.state === State.ACTIVE) {
            try {
                const textId = storeTempText(props.markdown);
                router.push(`/text-selection?textId=${textId}`);
            } catch (error) {
                console.error('Error storing text for selection:', error);
                Modal.alert('Error', 'Failed to open text selection. Please try again.');
            }
        }
    }, [props.markdown, router]);
    const renderContent = () => {
        return (
            <View style={{ width: '100%' }}>
                {blocks.map((block, index) => {
                    if (block.type === 'text') {
                        return <RenderTextBlock spans={block.content} key={index} first={index === 0} last={index === blocks.length - 1} selectable={selectable} />;
                    } else if (block.type === 'header') {
                        return <RenderHeaderBlock level={block.level} spans={block.content} key={index} first={index === 0} last={index === blocks.length - 1} selectable={selectable} />;
                    } else if (block.type === 'horizontal-rule') {
                        return <View style={style.horizontalRule} key={index} />;
                    } else if (block.type === 'list') {
                        return <RenderListBlock items={block.items} key={index} first={index === 0} last={index === blocks.length - 1} selectable={selectable} />;
                    } else if (block.type === 'numbered-list') {
                        return <RenderNumberedListBlock items={block.items} key={index} first={index === 0} last={index === blocks.length - 1} selectable={selectable} />;
                    } else if (block.type === 'code-block') {
                        return <RenderCodeBlock content={block.content} language={block.language} key={index} first={index === 0} last={index === blocks.length - 1} selectable={selectable} />;
                    } else if (block.type === 'mermaid') {
                        return <MermaidRenderer content={block.content} key={index} />;
                    } else if (block.type === 'options') {
                        return <RenderOptionsBlock items={block.items} key={index} first={index === 0} last={index === blocks.length - 1} selectable={selectable} onOptionPress={props.onOptionPress} />;
                    } else if (block.type === 'table') {
                        return <RenderTableBlock headers={block.headers} rows={block.rows} key={index} first={index === 0} last={index === blocks.length - 1} />;
                    } else if (block.type === 'image') {
                        return <MarkdownImage url={block.url} alt={block.alt} key={index} />;
                    } else {
                        return null;
                    }
                })}
            </View>
        );
    }

    if (!markdownCopyV2) {
        return renderContent();
    }
    
    if (Platform.OS === 'web') {
        return renderContent();
    }
    
    return (
        <LongPressGestureHandler
            onHandlerStateChange={handleLongPressGesture}
            minDurationMs={500}
        >
            <View style={{ width: '100%' }}>
                {renderContent()}
            </View>
        </LongPressGestureHandler>
    );
});

function RenderTextBlock(props: { spans: MarkdownSpan[], first: boolean, last: boolean, selectable: boolean }) {
    return <Text selectable={props.selectable} style={[style.text, props.first && style.first, props.last && style.last]}><RenderSpans spans={props.spans} baseStyle={style.text} /></Text>;
}

function RenderHeaderBlock(props: { level: 1 | 2 | 3 | 4 | 5 | 6, spans: MarkdownSpan[], first: boolean, last: boolean, selectable: boolean }) {
    const s = (style as any)[`header${props.level}`];
    const headerStyle = [style.header, s, props.first && style.first, props.last && style.last];
    return <Text selectable={props.selectable} style={headerStyle}><RenderSpans spans={props.spans} baseStyle={headerStyle} /></Text>;
}

function RenderListBlock(props: { items: MarkdownSpan[][], first: boolean, last: boolean, selectable: boolean }) {
    const listStyle = [style.text, style.list];
    return (
        <View style={{ flexDirection: 'column', marginBottom: 8, gap: 1 }}>
            {props.items.map((item, index) => (
                <Text selectable={props.selectable} style={listStyle} key={index}>- <RenderSpans spans={item} baseStyle={listStyle} /></Text>
            ))}
        </View>
    );
}

function RenderNumberedListBlock(props: { items: { number: number, spans: MarkdownSpan[] }[], first: boolean, last: boolean, selectable: boolean }) {
    const listStyle = [style.text, style.list];
    return (
        <View style={{ flexDirection: 'column', marginBottom: 8, gap: 1 }}>
            {props.items.map((item, index) => (
                <Text selectable={props.selectable} style={listStyle} key={index}>{item.number.toString()}. <RenderSpans spans={item.spans} baseStyle={listStyle} /></Text>
            ))}
        </View>
    );
}

function RenderCodeBlock(props: { content: string, language: string | null, first: boolean, last: boolean, selectable: boolean }) {
    const [isHovered, setIsHovered] = React.useState(false);

    const copyCode = React.useCallback(async () => {
        try {
            await Clipboard.setStringAsync(props.content);
            Modal.alert(t('common.success'), t('markdown.codeCopied'), [{ text: t('common.ok'), style: 'cancel' }]);
        } catch (error) {
            console.error('Failed to copy code:', error);
            Modal.alert(t('common.error'), t('markdown.copyFailed'), [{ text: t('common.ok'), style: 'cancel' }]);
        }
    }, [props.content]);

    return (
        <View
            style={[style.codeBlock, props.first && style.first, props.last && style.last]}
            // @ts-ignore - Web only events
            onMouseEnter={() => setIsHovered(true)}
            // @ts-ignore - Web only events
            onMouseLeave={() => setIsHovered(false)}
        >
            {props.language && <Text selectable={props.selectable} style={style.codeLanguage}>{props.language}</Text>}
            <ScrollView
                style={{ flexGrow: 0, flexShrink: 0 }}
                horizontal={true}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
                showsHorizontalScrollIndicator={false}
            >
                <SimpleSyntaxHighlighter
                    code={props.content}
                    language={props.language}
                    selectable={props.selectable}
                />
            </ScrollView>
            <View style={[style.copyButtonWrapper, isHovered && style.copyButtonWrapperVisible]}>
                <Pressable
                    style={style.copyButton}
                    onPress={copyCode}
                >
                    <Text style={style.copyButtonText}>{t('common.copy')}</Text>
                </Pressable>
            </View>
        </View>
    );
}

function RenderOptionsBlock(props: { 
    items: string[], 
    first: boolean, 
    last: boolean, 
    selectable: boolean,
    onOptionPress?: (option: Option) => void 
}) {
    return (
        <View style={[style.optionsContainer, props.first && style.first, props.last && style.last]}>
            {props.items.map((item, index) => {
                if (props.onOptionPress) {
                    return (
                        <Pressable 
                            key={index} 
                            style={({ pressed }) => [
                                style.optionItem,
                                pressed && style.optionItemPressed
                            ]}
                            onPress={() => props.onOptionPress?.({ title: item })}
                        >
                            <Text selectable={props.selectable} style={style.optionText}>{item}</Text>
                        </Pressable>
                    );
                } else {
                    return (
                        <View key={index} style={style.optionItem}>
                            <Text selectable={props.selectable} style={style.optionText}>{item}</Text>
                        </View>
                    );
                }
            })}
        </View>
    );
}

function RenderSpans(props: { spans: MarkdownSpan[], baseStyle?: any }) {
    return (<>
        {props.spans.map((span, index) => {
            if (span.url) {
                return (
                    <Link key={index} href={span.url as any} target="_blank">
                        <Text selectable style={[style.link, span.styles.map(s => style[s])]}>{span.text}</Text>
                    </Link>
                );
            } else {
                return <Text key={index} selectable style={[props.baseStyle, span.styles.map(s => style[s])]}>{span.text}</Text>
            }
        })}
    </>)
}

function RenderTableBlock(props: {
    headers: string[],
    rows: string[][],
    first: boolean,
    last: boolean
}) {
    // Use native HTML table on web for proper table layout
    if (Platform.OS === 'web') {
        return <RenderTableBlockWeb {...props} />;
    }
    return <RenderTableBlockNative {...props} />;
}

// Web implementation using native HTML table
function RenderTableBlockWeb(props: {
    headers: string[],
    rows: string[][],
    first: boolean,
    last: boolean
}) {
    const { theme } = useUnistyles();

    return (
        <View style={[style.tableContainer, props.first && style.first, props.last && style.last]}>
            <div
                style={{
                    overflowX: 'auto',
                    width: '100%',
                }}
            >
                <table
                    style={{
                        width: '100%',
                        tableLayout: 'auto',
                        borderCollapse: 'collapse',
                        borderSpacing: 0,
                    }}
                >
                    <thead>
                        <tr>
                            {props.headers.map((header, index) => (
                                <th
                                    key={`header-${index}`}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: theme.colors.surfaceHigh,
                                        borderBottom: `1px solid ${theme.colors.divider}`,
                                        borderRight: index < props.headers.length - 1 ? `1px solid ${theme.colors.divider}` : 'none',
                                        fontWeight: 600,
                                        textAlign: 'left',
                                        verticalAlign: 'top',
                                    }}
                                >
                                    <Text selectable style={style.tableHeaderText}>
                                        <RenderSpans spans={parseMarkdownSpans(header, false)} baseStyle={style.tableHeaderText} />
                                    </Text>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {props.rows.map((row, rowIndex) => (
                            <tr key={`row-${rowIndex}`}>
                                {row.map((cell, cellIndex) => (
                                    <td
                                        key={`cell-${rowIndex}-${cellIndex}`}
                                        style={{
                                            padding: '8px 12px',
                                            borderBottom: rowIndex < props.rows.length - 1 ? `1px solid ${theme.colors.divider}` : 'none',
                                            borderRight: cellIndex < row.length - 1 ? `1px solid ${theme.colors.divider}` : 'none',
                                            verticalAlign: 'top',
                                        }}
                                    >
                                        <Text selectable style={style.tableCellText}>
                                            <RenderSpans spans={parseMarkdownSpans(cell, false)} baseStyle={style.tableCellText} />
                                        </Text>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </View>
    );
}

// Native implementation using column-based layout for consistent column widths
// Each column is a vertical stack, and columns are laid out horizontally
// This ensures each column sizes to its widest content
function RenderTableBlockNative(props: {
    headers: string[],
    rows: string[][],
    first: boolean,
    last: boolean
}) {
    const columnCount = props.headers.length;

    return (
        <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                nestedScrollEnabled={true}
            >
                <View style={[style.tableContainerNative, props.first && style.first, props.last && style.last]}>
            <View style={style.tableColumnsContainer}>
                    {props.headers.map((header, colIndex) => (
                        <View key={`col-${colIndex}`} style={style.tableColumn}>
                            {/* Header cell */}
                            <View style={[style.tableCell, style.tableHeaderCell, style.tableCellBorderBottom, colIndex < columnCount - 1 && style.tableCellBorderRight]}>
                                <Text style={style.tableHeaderText}>
                                    <RenderSpans spans={parseMarkdownSpans(header, false)} baseStyle={style.tableHeaderText} />
                                </Text>
                            </View>
                            {/* Data cells for this column */}
                            {props.rows.map((row, rowIndex) => (
                                <View
                                    key={`cell-${colIndex}-${rowIndex}`}
                                    style={[
                                        style.tableCell,
                                        colIndex < columnCount - 1 && style.tableCellBorderRight,
                                        rowIndex < props.rows.length - 1 && style.tableCellBorderBottom
                                    ]}
                                >
                                    <Text style={style.tableCellText}>
                                        <RenderSpans spans={parseMarkdownSpans(row[colIndex] || '', false)} baseStyle={style.tableCellText} />
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
        </View>
            </ScrollView>
    );
}


const style = StyleSheet.create((theme) => ({

    // Plain text

    text: {
        ...Typography.default(),
        fontSize: 16,
        lineHeight: 24, // Reduced from 28 to 24
        marginTop: 8,
        marginBottom: 8,
        color: theme.colors.text,
        fontWeight: '400',
    },

    italic: {
        fontStyle: 'italic',
    },
    bold: {
        fontWeight: 'bold',
    },
    semibold: {
        fontWeight: '600',
    },
    code: {
        ...Typography.mono(),
        fontSize: 16,
        lineHeight: 21,  // Reduced from 24 to 21
        backgroundColor: theme.colors.surfaceHighest,
        color: theme.colors.text,
    },
    link: {
        ...Typography.default(),
        color: theme.colors.textLink,
        fontWeight: '400',
        textDecorationLine: 'underline',
    },

    // Headers

    header: {
        ...Typography.default('semiBold'),
        color: theme.colors.text,
    },
    header1: {
        fontSize: 16,
        lineHeight: 24,  // Reduced from 36 to 24
        fontWeight: '900',
        marginTop: 16,
        marginBottom: 8
    },
    header2: {
        fontSize: 20,
        lineHeight: 24,  // Reduced from 36 to 32
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8
    },
    header3: {
        fontSize: 16,
        lineHeight: 28,  // Reduced from 32 to 28
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    header4: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '600',
        marginTop: 8,
        marginBottom: 8,
    },
    header5: {
        fontSize: 16,
        lineHeight: 24,  // Reduced from 28 to 24
        fontWeight: '600'
    },
    header6: {
        fontSize: 16,
        lineHeight: 24, // Reduced from 28 to 24
        fontWeight: '600'
    },

    //
    // List
    //

    list: {
        ...Typography.default(),
        color: theme.colors.text,
        marginTop: 0,
        marginBottom: 0,
    },

    //
    // Common
    //

    first: {
        // marginTop: 0
    },
    last: {
        // marginBottom: 0
    },

    //
    // Code Block
    //

    codeBlock: {
        backgroundColor: theme.colors.surfaceHighest,
        borderRadius: 8,
        marginVertical: 8,
        position: 'relative',
        zIndex: 1,
    },
    copyButtonWrapper: {
        position: 'absolute',
        top: 8,
        right: 8,
        opacity: 0,
        zIndex: 10,
        elevation: 10,
        pointerEvents: 'none',
    },
    copyButtonWrapperVisible: {
        opacity: 1,
        pointerEvents: 'auto',
    },
    codeLanguage: {
        ...Typography.mono(),
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 8,
        paddingHorizontal: 16,
        marginBottom: 0,
    },
    codeText: {
        ...Typography.mono(),
        color: theme.colors.text,
        fontSize: 14,
        lineHeight: 20,
    },
    horizontalRule: {
        height: 1,
        backgroundColor: theme.colors.divider,
        marginTop: 8,
        marginBottom: 8,
    },
    copyButtonContainer: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
        elevation: 10,
        opacity: 1,
    },
    copyButtonContainerHidden: {
        opacity: 0,
    },
    copyButton: {
        backgroundColor: theme.colors.surfaceHighest,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        cursor: 'pointer',
    },
    copyButtonHidden: {
        display: 'none',
    },
    copyButtonCopied: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
        opacity: 1,
    },
    copyButtonText: {
        ...Typography.default(),
        color: theme.colors.text,
        fontSize: 12,
        lineHeight: 16,
    },

    //
    // Options Block
    //

    optionsContainer: {
        flexDirection: 'column',
        gap: 8,
        marginVertical: 8,
    },
    optionItem: {
        backgroundColor: theme.colors.surfaceHighest,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    optionItemPressed: {
        opacity: 0.7,
        backgroundColor: theme.colors.surfaceHigh,
    },
    optionText: {
        ...Typography.default(),
        fontSize: 16,
        lineHeight: 24,
        color: theme.colors.text,
    },

    //
    // Table
    //

    tableContainer: {
        marginVertical: 8,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderRadius: 8,
        width: '100%',
        alignSelf: 'stretch',
    },
    tableContainerNative: {
        alignSelf: 'flex-start',
        marginVertical: 8,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderRadius: 8,
        overflow: 'hidden',
    },
    tableColumnsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    tableColumn: {
        flexDirection: 'column',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    tableCell: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 42,
        justifyContent: 'center', // Vertically center content
    },
    tableCellFlex: {
        flex: 1,
        flexBasis: 0,
    },
    tableCellBorderRight: {
        borderRightWidth: 1,
        borderRightColor: theme.colors.divider,
    },
    tableCellBorderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    tableHeaderCell: {
        backgroundColor: theme.colors.surfaceHigh,
    },
    tableHeaderText: {
        ...Typography.default('semiBold'),
        color: theme.colors.text,
        fontSize: 16,
        lineHeight: 24,
    },
    tableCellText: {
        ...Typography.default(),
        color: theme.colors.text,
        fontSize: 16,
        lineHeight: 24,
    },

    // Add global style for Web platform (Unistyles supports this via compiler plugin)
    ...(Platform.OS === 'web' ? {
        // Web-only CSS styles
        _____web_global_styles: {}
    } : {}),
}));