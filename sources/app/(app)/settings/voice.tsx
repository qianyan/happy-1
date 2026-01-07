import React, { useState, useCallback, memo } from 'react';
import { View, TextInput, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Item } from '@/components/Item';
import { ItemGroup } from '@/components/ItemGroup';
import { ItemList } from '@/components/ItemList';
import { Text } from '@/components/StyledText';
import { RoundButton } from '@/components/RoundButton';
import { Modal } from '@/modal';
import { useSettingMutable, storage } from '@/sync/storage';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { findLanguageByCode, getLanguageDisplayName, LANGUAGES } from '@/constants/Languages';
import { t } from '@/text';
import { Typography } from '@/constants/Typography';
import { layout } from '@/components/layout';

function VoiceSettingsScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const [voiceAssistantLanguage] = useSettingMutable('voiceAssistantLanguage');
    const [savedApiKey, setSavedApiKey] = useSettingMutable('openaiApiKey');
    const [savedVocabulary, setSavedVocabulary] = useSettingMutable('whisperVocabulary');

    // Local state for input fields
    const [apiKeyInput, setApiKeyInput] = useState(savedApiKey || '');
    const [vocabularyInput, setVocabularyInput] = useState(savedVocabulary || '');

    // Show/hide API key
    const [showApiKey, setShowApiKey] = useState(false);

    // Find current language or default to first option
    const currentLanguage = findLanguageByCode(voiceAssistantLanguage) || LANGUAGES[0];

    // Save API key when user leaves the field
    const handleApiKeyBlur = useCallback(() => {
        if (apiKeyInput.trim() !== (savedApiKey || '')) {
            setSavedApiKey(apiKeyInput.trim() || null);
        }
    }, [apiKeyInput, savedApiKey, setSavedApiKey]);

    // Save vocabulary when user leaves the field
    const handleVocabularyBlur = useCallback(() => {
        if (vocabularyInput.trim() !== (savedVocabulary || '')) {
            setSavedVocabulary(vocabularyInput.trim() || null);
        }
    }, [vocabularyInput, savedVocabulary, setSavedVocabulary]);

    // Save credentials manually
    const handleSaveCredentials = useCallback(() => {
        if (!apiKeyInput.trim()) {
            Modal.alert(t('common.error'), t('settingsVoice.apiKeyRequired'));
            return;
        }

        storage.getState().applySettingsLocal({
            openaiApiKey: apiKeyInput.trim(),
        });

        Modal.alert(t('common.success'), t('settingsVoice.credentialsSaved'));
    }, [apiKeyInput]);

    const getApiKeyStatusText = () => {
        if (savedApiKey) {
            return t('settingsVoice.apiKeyConfigured');
        }
        return t('settingsVoice.apiKeyNotConfigured');
    };

    return (
        <ItemList style={{ paddingTop: 0 }}>
            {/* Language Settings */}
            <ItemGroup
                title={t('settingsVoice.languageTitle')}
                footer={t('settingsVoice.languageDescription')}
            >
                <Item
                    title={t('settingsVoice.preferredLanguage')}
                    subtitle={t('settingsVoice.preferredLanguageSubtitle')}
                    icon={<Ionicons name="language-outline" size={29} color="#007AFF" />}
                    detail={getLanguageDisplayName(currentLanguage)}
                    onPress={() => router.push('/settings/voice/language')}
                />
            </ItemGroup>

            {/* OpenAI Configuration */}
            <ItemGroup
                title={t('settingsVoice.openaiTitle')}
                footer={t('settingsVoice.openaiDescription')}
            >
                <Item
                    title={t('settingsVoice.openaiApiKey')}
                    subtitle={getApiKeyStatusText()}
                    icon={<Ionicons name="mic-outline" size={29} color="#10A37F" />}
                    showChevron={false}
                />
            </ItemGroup>

            {/* API Key Input */}
            <ItemGroup
                title={t('settingsVoice.apiKeyCredentials')}
                footer={t('settingsVoice.apiKeyCredentialsDescription')}
            >
                <View style={styles.contentContainer}>
                    {/* API Key */}
                    <View style={styles.labelRow}>
                        <Text style={styles.labelText}>{t('settingsVoice.apiKey').toUpperCase()}</Text>
                        <Pressable
                            onPress={() => Linking.openURL('https://platform.openai.com/api-keys')}
                            style={styles.helpButton}
                        >
                            <Ionicons name="help-circle-outline" size={18} color={theme.colors.textLink} />
                            <Text style={[styles.helpText, { color: theme.colors.textLink }]}>{t('settingsVoice.getApiKey')}</Text>
                        </Pressable>
                    </View>
                    <View style={styles.inputWithButton}>
                        <TextInput
                            style={[styles.textInputFlex, { color: theme.colors.input.text, backgroundColor: theme.colors.input.background }]}
                            value={apiKeyInput}
                            onChangeText={setApiKeyInput}
                            onBlur={handleApiKeyBlur}
                            placeholder={t('settingsVoice.openaiApiKeyPlaceholder')}
                            placeholderTextColor={theme.colors.input.placeholder}
                            autoCapitalize="none"
                            autoCorrect={false}
                            spellCheck={false}
                            secureTextEntry={!showApiKey}
                        />
                        <Pressable
                            style={[styles.showHideButton, { backgroundColor: theme.colors.input.background }]}
                            onPress={() => setShowApiKey(!showApiKey)}
                        >
                            <Ionicons
                                name={showApiKey ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color={theme.colors.textSecondary}
                            />
                        </Pressable>
                    </View>

                    <Text style={styles.hintText}>{t('settingsVoice.whisperHint')}</Text>

                    {/* Save Button */}
                    <View style={styles.saveButtonContainer}>
                        <RoundButton
                            title={t('settingsVoice.saveCredentials')}
                            size="normal"
                            onPress={handleSaveCredentials}
                        />
                    </View>
                </View>
            </ItemGroup>

            {/* Custom Vocabulary */}
            <ItemGroup
                title={t('settingsVoice.vocabularyTitle')}
                footer={t('settingsVoice.vocabularyDescription')}
            >
                <View style={styles.contentContainer}>
                    <View style={styles.labelRow}>
                        <Text style={styles.labelText}>{t('settingsVoice.vocabularyLabel').toUpperCase()}</Text>
                    </View>
                    <TextInput
                        style={[styles.textArea, { color: theme.colors.input.text, backgroundColor: theme.colors.input.background }]}
                        value={vocabularyInput}
                        onChangeText={setVocabularyInput}
                        onBlur={handleVocabularyBlur}
                        placeholder={t('settingsVoice.vocabularyPlaceholder')}
                        placeholderTextColor={theme.colors.input.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                    <Text style={styles.hintText}>{t('settingsVoice.vocabularyHint')}</Text>
                </View>
            </ItemGroup>

        </ItemList>
    );
}

export default memo(VoiceSettingsScreen);

const styles = StyleSheet.create((theme) => ({
    contentContainer: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
        width: '100%',
        maxWidth: layout.maxWidth,
        alignSelf: 'center',
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 8,
    },
    labelText: {
        ...Typography.default('semiBold'),
        fontSize: 12,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    helpButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    helpText: {
        ...Typography.default(),
        fontSize: 12,
    },
    inputWithButton: {
        flexDirection: 'row',
        marginBottom: 8,
        gap: 8,
    },
    textInputFlex: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        ...Typography.mono(),
        fontSize: 14,
    },
    textArea: {
        padding: 12,
        borderRadius: 8,
        ...Typography.default(),
        fontSize: 14,
        minHeight: 100,
    },
    showHideButton: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    hintText: {
        ...Typography.default(),
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 12,
        lineHeight: 16,
    },
    saveButtonContainer: {
        marginTop: 16,
    },
}));
