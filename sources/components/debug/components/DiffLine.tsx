import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

interface DiffLineProps {
    type: 'remove' | 'add' | 'context';
    text: string;
    lineNumber?: number;
}

/**
 * Shared diff line component for debug renderers
 * Displays a single line with diff styling (-, +, or context)
 */
export const DiffLine = React.memo<DiffLineProps>((props) => {
    const { type, text, lineNumber } = props;
    const { theme } = useUnistyles();

    const symbol = type === 'remove' ? '- ' : type === 'add' ? '+ ' : '  ';

    // Use theme diff colors for consistency with main message thread
    // Even more subtle than main editor's diff view (50% opacity on backgrounds)
    const color =
        type === 'remove'
            ? theme.colors.diff.removedText
            : type === 'add'
            ? theme.colors.diff.addedText
            : theme.colors.diff.contextText;

    const bgColor =
        type === 'remove'
            ? theme.dark ? 'rgba(255, 238, 240, 0.05)' : 'rgba(255, 238, 240, 0.5)' // 50% opacity of removedBg
            : type === 'add'
            ? theme.dark ? 'rgba(230, 255, 237, 0.05)' : 'rgba(230, 255, 237, 0.5)' // 50% opacity of addedBg
            : 'transparent';

    return (
        <View
            style={{
                backgroundColor: bgColor,
                paddingHorizontal: 4,
                paddingVertical: 1,
                flexDirection: 'row',
            }}
        >
            {lineNumber !== undefined && (
                <Text
                    style={{
                        fontSize: 8,
                        lineHeight: 13,
                        color: theme.colors.textSecondary,
                        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                        marginRight: 8,
                        width: 30,
                        textAlign: 'right',
                    }}
                >
                    {lineNumber}
                </Text>
            )}
            <Text
                style={{
                    fontSize: 9,
                    lineHeight: 13,
                    color,
                    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                    flex: 1,
                }}
                selectable
            >
                {symbol}{text}
            </Text>
        </View>
    );
});

DiffLine.displayName = 'DiffLine';
