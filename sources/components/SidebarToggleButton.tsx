import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Image } from 'expo-image';
import { storage } from '@/sync/storage';

/**
 * Floating button shown when sidebar is collapsed on web.
 * Clicking it or pressing Cmd+B or Cmd+1 expands the sidebar.
 */
export const SidebarToggleButton = React.memo(() => {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const safeArea = useSafeAreaInsets();

    const handlePress = React.useCallback(() => {
        storage.getState().applyLocalSettings({ sidebarCollapsed: false });
    }, []);

    return (
        <View
            style={[
                styles.container,
                { top: safeArea.top + 8 }
            ]}
        >
            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    pressed ? styles.buttonPressed : styles.buttonDefault
                ]}
                onPress={handlePress}
            >
                <Image
                    source={require('@/assets/images/brutalist/Abstract 208.png')}
                    contentFit="contain"
                    style={{ width: 24, height: 24 }}
                    tintColor={theme.colors.fab.icon}
                />
            </Pressable>
        </View>
    );
});

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        position: 'absolute',
        left: 16,
        zIndex: 100,
    },
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 3.84,
        shadowOpacity: theme.colors.shadow.opacity,
        elevation: 5,
    },
    buttonDefault: {
        backgroundColor: theme.colors.fab.background,
    },
    buttonPressed: {
        backgroundColor: theme.colors.fab.backgroundPressed,
    },
}));
