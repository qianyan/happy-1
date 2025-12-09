import * as React from 'react';
import { View, Platform, Text, Pressable, Modal as RNModal, useWindowDimensions, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Style for Web platform
const webStyle: any = {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    overflow: 'auto',
};

// Toolbar component for diagram actions
const MermaidToolbar = React.memo(({
    onFullscreen,
    onDownload,
    isDownloading,
}: {
    onFullscreen: () => void;
    onDownload: () => void;
    isDownloading: boolean;
}) => {
    const { theme } = useUnistyles();

    return (
        <View style={styles.toolbar}>
            <Pressable
                onPress={onFullscreen}
                style={({ pressed }) => [
                    styles.toolbarButton,
                    { backgroundColor: theme.colors.surfaceHigh },
                    pressed && styles.toolbarButtonPressed,
                ]}
                hitSlop={8}
            >
                <Ionicons name="expand-outline" size={16} color={theme.colors.text} />
            </Pressable>
            <Pressable
                onPress={onDownload}
                disabled={isDownloading}
                style={({ pressed }) => [
                    styles.toolbarButton,
                    { backgroundColor: theme.colors.surfaceHigh },
                    pressed && styles.toolbarButtonPressed,
                    isDownloading && styles.toolbarButtonDisabled,
                ]}
                hitSlop={8}
            >
                <Ionicons
                    name={isDownloading ? "hourglass-outline" : "download-outline"}
                    size={16}
                    color={isDownloading ? theme.colors.textSecondary : theme.colors.text}
                />
            </Pressable>
        </View>
    );
});

// Fullscreen modal component
const MermaidFullscreenModal = React.memo(({
    visible,
    onClose,
    svgContent,
    html,
    themeColors,
}: {
    visible: boolean;
    onClose: () => void;
    svgContent: string | null;
    html: string;
    themeColors: any;
}) => {
    const { width, height } = useWindowDimensions();
    const { theme } = useUnistyles();
    const insets = useSafeAreaInsets();

    if (Platform.OS === 'web') {
        if (!visible || !svgContent) return null;

        return (
            <RNModal
                visible={visible}
                transparent={true}
                animationType="fade"
                onRequestClose={onClose}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
                    <Pressable
                        onPress={onClose}
                        style={[styles.modalCloseButton, { top: insets.top + 16 }]}
                    >
                        <Ionicons name="close" size={28} color="#fff" />
                    </Pressable>
                    <ScrollView
                        style={styles.modalScrollView}
                        contentContainerStyle={styles.modalScrollContent}
                        maximumZoomScale={5}
                        minimumZoomScale={0.5}
                        showsHorizontalScrollIndicator={true}
                        showsVerticalScrollIndicator={true}
                    >
                        {/* @ts-ignore - Web only */}
                        <div
                            style={{
                                padding: 32,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minWidth: '100%',
                                minHeight: '100%',
                            }}
                            dangerouslySetInnerHTML={{ __html: svgContent }}
                        />
                    </ScrollView>
                </View>
            </RNModal>
        );
    }

    // Native fullscreen modal with WebView
    return (
        <RNModal
            visible={visible}
            transparent={false}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={[styles.modalContainer, { backgroundColor: themeColors.surfaceHighest }]}>
                <View style={[styles.modalHeader, { paddingTop: insets.top }]}>
                    <Pressable onPress={onClose} style={styles.modalHeaderButton}>
                        <Ionicons name="close" size={28} color={themeColors.text} />
                    </Pressable>
                    <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                        {t('markdown.mermaidDiagram')}
                    </Text>
                    <View style={styles.modalHeaderButton} />
                </View>
                <WebView
                    source={{ html }}
                    style={{ flex: 1, backgroundColor: themeColors.surfaceHighest }}
                    scrollEnabled={true}
                    originWhitelist={['*']}
                    scalesPageToFit={true}
                />
            </View>
        </RNModal>
    );
});

// Convert SVG to PNG and download (Web)
async function downloadSvgAsPng(svgContent: string, filename: string = 'mermaid-diagram') {
    if (Platform.OS !== 'web') return;

    try {
        // Create a temporary container
        const container = document.createElement('div');
        container.innerHTML = svgContent;
        const svgElement = container.querySelector('svg');

        if (!svgElement) {
            throw new Error('No SVG element found');
        }

        // Get SVG dimensions from attributes or viewBox
        let width = 800;
        let height = 600;

        const widthAttr = svgElement.getAttribute('width');
        const heightAttr = svgElement.getAttribute('height');
        const viewBox = svgElement.getAttribute('viewBox');

        if (widthAttr && heightAttr) {
            width = parseFloat(widthAttr) || width;
            height = parseFloat(heightAttr) || height;
        } else if (viewBox) {
            const parts = viewBox.split(/\s+|,/).map(Number);
            if (parts.length >= 4) {
                width = parts[2] || width;
                height = parts[3] || height;
            }
        }

        // Ensure SVG has explicit dimensions for canvas rendering
        svgElement.setAttribute('width', String(width));
        svgElement.setAttribute('height', String(height));

        // Create canvas
        const canvas = document.createElement('canvas');
        const scale = 2; // Higher resolution
        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        // Set dark background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);

        // Convert SVG to base64 data URL (more reliable than blob URL)
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const base64 = btoa(unescape(encodeURIComponent(svgString)));
        const dataUrl = `data:image/svg+xml;base64,${base64}`;

        // Load image and draw to canvas
        return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);

                // Download PNG
                const pngUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `${filename}.png`;
                link.href = pngUrl;
                link.click();
                resolve();
            };
            img.onerror = () => {
                // Fallback: download as SVG
                downloadSvg(svgContent, filename);
                resolve();
            };
            img.src = dataUrl;
        });
    } catch (error) {
        console.error('Failed to download as PNG:', error);
        // Fallback: download as SVG
        downloadSvg(svgContent, filename);
    }
}

// Download SVG directly (Web fallback)
function downloadSvg(svgContent: string, filename: string = 'mermaid-diagram') {
    if (Platform.OS !== 'web') return;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${filename}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

// Mermaid render component that works on all platforms
export const MermaidRenderer = React.memo((props: {
    content: string;
}) => {
    const { theme } = useUnistyles();
    const [svgContent, setSvgContent] = React.useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [isDownloading, setIsDownloading] = React.useState(false);

    const handleFullscreen = React.useCallback(() => {
        setIsFullscreen(true);
    }, []);

    const handleCloseFullscreen = React.useCallback(() => {
        setIsFullscreen(false);
    }, []);

    // Generate HTML for WebView (native platforms)
    const generateHtml = React.useCallback((forExport: boolean = false) => `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0${forExport ? '' : ', maximum-scale=3.0, user-scalable=yes'}">
            <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
            <style>
                * {
                    box-sizing: border-box;
                }
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    min-height: 100%;
                    background-color: ${theme.colors.surfaceHighest};
                }
                body {
                    padding: 12px;
                }
                .mermaid {
                    width: 100%;
                }
                .mermaid svg {
                    width: 100% !important;
                    max-width: 100% !important;
                    height: auto !important;
                }
            </style>
        </head>
        <body>
            <div class="mermaid" id="mermaid-container">
${props.content}
            </div>
            <script>
                mermaid.initialize({
                    startOnLoad: true,
                    theme: 'dark',
                    securityLevel: 'loose'
                });
            </script>
        </body>
        </html>
    `, [props.content, theme.colors.surfaceHighest]);

    const html = generateHtml();
    const fullscreenHtml = generateHtml(false);

    // Web platform uses direct SVG rendering
    if (Platform.OS === 'web') {
        const [hasError, setHasError] = React.useState(false);

        React.useEffect(() => {
            let isMounted = true;
            setHasError(false);

            const renderMermaid = async () => {
                try {
                    const mermaidModule: any = await import('mermaid');
                    const mermaid = mermaidModule.default || mermaidModule;

                    if (mermaid.initialize) {
                        mermaid.initialize({
                            startOnLoad: false,
                            theme: 'dark'
                        });
                    }

                    if (mermaid.render) {
                        const { svg } = await mermaid.render(
                            `mermaid-${Date.now()}`,
                            props.content
                        );

                        if (isMounted) {
                            setSvgContent(svg);
                        }
                    }
                } catch (error) {
                    if (isMounted) {
                        console.warn(`[Mermaid] ${t('markdown.mermaidRenderFailed')}: ${error instanceof Error ? error.message : String(error)}`);
                        setHasError(true);
                    }
                }
            };

            renderMermaid();

            return () => {
                isMounted = false;
            };
        }, [props.content]);

        const handleDownloadWeb = React.useCallback(async () => {
            if (!svgContent) return;
            setIsDownloading(true);
            try {
                await downloadSvgAsPng(svgContent);
            } finally {
                setIsDownloading(false);
            }
        }, [svgContent]);

        if (hasError) {
            return (
                <View style={[styles.container, styles.errorContainer]}>
                    <View style={styles.errorContent}>
                        <Text style={styles.errorText}>{t('markdown.mermaidSyntaxError')}</Text>
                        <View style={styles.codeBlock}>
                            <Text style={styles.codeText}>{props.content}</Text>
                        </View>
                    </View>
                </View>
            );
        }

        if (!svgContent) {
            return (
                <View style={[styles.container, styles.loadingContainer]}>
                    <View style={styles.loadingPlaceholder} />
                </View>
            );
        }

        return (
            <View style={styles.container}>
                <View style={styles.diagramWrapper}>
                    <MermaidToolbar
                        onFullscreen={handleFullscreen}
                        onDownload={handleDownloadWeb}
                        isDownloading={isDownloading}
                    />
                    {/* @ts-ignore - Web only */}
                    <div
                        style={webStyle}
                        dangerouslySetInnerHTML={{ __html: svgContent }}
                    />
                </View>
                <MermaidFullscreenModal
                    visible={isFullscreen}
                    onClose={handleCloseFullscreen}
                    svgContent={svgContent}
                    html={fullscreenHtml}
                    themeColors={theme.colors}
                />
            </View>
        );
    }

    // For iOS/Android, render WebView with toolbar in header row (not overlaid)
    // WebView renders in a native layer above React Native views, so overlay doesn't work
    return (
        <View style={styles.container}>
            <View style={[styles.nativeHeader, { backgroundColor: theme.colors.surfaceHighest }]}>
                <Text style={[styles.nativeHeaderTitle, { color: theme.colors.textSecondary }]}>
                    {t('markdown.mermaidDiagram')}
                </Text>
                <Pressable
                    onPress={handleFullscreen}
                    style={({ pressed }) => [
                        styles.toolbarButton,
                        { backgroundColor: theme.colors.surface },
                        pressed && styles.toolbarButtonPressed,
                    ]}
                    hitSlop={8}
                >
                    <Ionicons name="expand-outline" size={16} color={theme.colors.text} />
                </Pressable>
            </View>
            <WebView
                source={{ html }}
                style={[styles.nativeWebView, { backgroundColor: theme.colors.surfaceHighest }]}
                scrollEnabled={true}
                originWhitelist={['*']}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={false}
            />
            <MermaidFullscreenModal
                visible={isFullscreen}
                onClose={handleCloseFullscreen}
                svgContent={null}
                html={fullscreenHtml}
                themeColors={theme.colors}
            />
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        marginVertical: 8,
        width: '100%',
    },
    diagramWrapper: {
        position: 'relative',
        width: '100%',
    },
    toolbar: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        gap: 4,
        zIndex: 10,
    },
    toolbarButton: {
        width: 32,
        height: 32,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolbarButtonPressed: {
        opacity: 0.7,
    },
    toolbarButtonDisabled: {
        opacity: 0.5,
    },
    nativeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    nativeHeaderTitle: {
        ...Typography.default('semiBold'),
        fontSize: 13,
    },
    nativeWebView: {
        height: 350,
        width: '100%',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        overflow: 'hidden',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 100,
    },
    loadingPlaceholder: {
        width: 200,
        height: 20,
        backgroundColor: theme.colors.divider,
        borderRadius: 4,
    },
    errorContainer: {
        backgroundColor: theme.colors.surfaceHighest,
        borderRadius: 8,
        padding: 16,
    },
    errorContent: {
        flexDirection: 'column',
        gap: 12,
    },
    errorText: {
        ...Typography.default('semiBold'),
        color: theme.colors.text,
        fontSize: 16,
    },
    codeBlock: {
        backgroundColor: theme.colors.surfaceHigh,
        borderRadius: 4,
        padding: 12,
    },
    codeText: {
        ...Typography.mono(),
        color: theme.colors.text,
        fontSize: 14,
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButton: {
        position: 'absolute',
        right: 16,
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalScrollView: {
        flex: 1,
        width: '100%',
    },
    modalScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingBottom: 8,
    },
    modalHeaderButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        ...Typography.default('semiBold'),
        fontSize: 17,
    },
}));
