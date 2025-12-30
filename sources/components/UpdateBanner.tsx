import React from 'react';
import { View, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Item } from './Item';
import { ItemGroup } from './ItemGroup';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useUpdates } from '@/hooks/useUpdates';
import { useChangelog } from '@/hooks/useChangelog';
import { useNativeUpdate } from '@/hooks/useNativeUpdate';
import { useRouter } from 'expo-router';
import { t } from '@/text';
import { layout } from './layout';

const stylesheet = StyleSheet.create((theme) => ({
    wrapper: {
        backgroundColor: theme.colors.groupped.background,
        alignItems: 'center',
    },
    container: {
        width: '100%',
        maxWidth: layout.maxWidth,
    },
    itemGroupStyle: {
        paddingTop: Platform.select({ ios: 8, default: 8 }),
    },
}));

export const UpdateBanner = React.memo(() => {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const { updateAvailable, reloadApp } = useUpdates();
    const { hasUnread, isInitialized, markAsRead } = useChangelog();
    const updateUrl = useNativeUpdate();
    const router = useRouter();

    // Show native app update banner (highest priority)
    if (updateUrl) {
        const handleOpenStore = async () => {
            try {
                const supported = await Linking.canOpenURL(updateUrl);
                if (supported) {
                    await Linking.openURL(updateUrl);
                }
            } catch (error) {
                console.error('Error opening app store:', error);
            }
        };

        return (
            <View style={styles.wrapper}>
                <View style={styles.container}>
                    <ItemGroup style={styles.itemGroupStyle}>
                        <Item
                            title={t('updateBanner.nativeUpdateAvailable')}
                            subtitle={Platform.OS === 'ios' ? t('updateBanner.tapToUpdateAppStore') : t('updateBanner.tapToUpdatePlayStore')}
                            icon={<Ionicons name="download-outline" size={28} color={theme.colors.success} />}
                            showChevron={true}
                            onPress={handleOpenStore}
                        />
                    </ItemGroup>
                </View>
            </View>
        );
    }

    // Show OTA update banner if available (second priority)
    if (updateAvailable) {
        return (
            <View style={styles.wrapper}>
                <View style={styles.container}>
                    <ItemGroup style={styles.itemGroupStyle}>
                        <Item
                            title={t('updateBanner.updateAvailable')}
                            subtitle={t('updateBanner.pressToApply')}
                            icon={<Ionicons name="download-outline" size={28} color={theme.colors.success} />}
                            showChevron={false}
                            onPress={reloadApp}
                        />
                    </ItemGroup>
                </View>
            </View>
        );
    }

    // Show changelog banner if there are unread changelog entries and changelog is initialized (lowest priority)
    if (isInitialized && hasUnread) {
        return (
            <View style={styles.wrapper}>
                <View style={styles.container}>
                    <ItemGroup style={styles.itemGroupStyle}>
                        <Item
                            title={t('updateBanner.whatsNew')}
                            subtitle={t('updateBanner.seeLatest')}
                            icon={<Ionicons name="sparkles-outline" size={28} color={theme.colors.text} />}
                            showChevron={true}
                            onPress={() => {
                                router.push('/changelog');
                                setTimeout(() => {
                                    markAsRead();
                                }, 1000);
                            }}
                        />
                    </ItemGroup>
                </View>
            </View>
        );
    }

    return null;
});
