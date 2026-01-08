import * as React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ToolViewProps } from './_all';
import { ToolSectionView } from '../ToolSectionView';
import { sessionAllowWithAnswers } from '@/sync/ops';
import { t } from '@/text';
import { Ionicons } from '@expo/vector-icons';

// Special index to represent "Other" option
const OTHER_OPTION_INDEX = -1;

interface QuestionOption {
    label: string;
    description: string;
}

interface Question {
    question: string;
    header: string;
    options: QuestionOption[];
    multiSelect: boolean;
}

interface AskUserQuestionInput {
    questions: Question[];
}

// Separate component for "Other" option to manage focus state
const OtherOption = React.memo<{
    questionIndex: number;
    multiSelect: boolean;
    isSelected: boolean;
    customText: string;
    canInteract: boolean;
    onToggle: () => void;
    onTextChange: (text: string) => void;
    styles: Record<string, any>;
    theme: any;
}>(({ multiSelect, isSelected, customText, canInteract, onToggle, onTextChange, styles, theme }) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
        <View>
            <TouchableOpacity
                style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                    !canInteract && styles.optionButtonDisabled,
                ]}
                onPress={onToggle}
                disabled={!canInteract}
                activeOpacity={0.7}
            >
                {multiSelect ? (
                    <View style={[
                        styles.checkboxOuter,
                        isSelected && styles.checkboxOuterSelected,
                    ]}>
                        {isSelected && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                        )}
                    </View>
                ) : (
                    <View style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                    ]}>
                        {isSelected && <View style={styles.radioInner} />}
                    </View>
                )}
                <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>{t('tools.askUserQuestion.other')}</Text>
                    <Text style={styles.optionDescription}>{t('tools.askUserQuestion.otherDescription')}</Text>
                </View>
            </TouchableOpacity>

            {isSelected && (
                <View style={styles.otherInputContainer}>
                    <TextInput
                        style={[
                            styles.otherTextInput,
                            isFocused && styles.otherTextInputFocused,
                        ]}
                        value={customText}
                        onChangeText={onTextChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={t('tools.askUserQuestion.otherPlaceholder')}
                        placeholderTextColor={theme.colors.textSecondary}
                        editable={canInteract}
                        autoFocus
                    />
                </View>
            )}
        </View>
    );
});

export const AskUserQuestionView = React.memo<ToolViewProps>(({ tool, sessionId }) => {
    const { theme } = useUnistyles();
    const [selections, setSelections] = React.useState<Map<number, Set<number>>>(new Map());
    const [customTexts, setCustomTexts] = React.useState<Map<number, string>>(new Map());
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSubmitted, setIsSubmitted] = React.useState(false);
    const [submittedAnswers, setSubmittedAnswers] = React.useState<Record<string, string> | null>(null);

    // Parse input
    const input = tool.input as AskUserQuestionInput | undefined;
    const questions = input?.questions;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return null;
    }

    const isRunning = tool.state === 'running';
    const canInteract = isRunning && !isSubmitted;

    // Check if all questions have at least one selection (or custom text if "Other" is selected)
    const allQuestionsAnswered = questions.every((_, qIndex) => {
        const selected = selections.get(qIndex);
        if (!selected || selected.size === 0) return false;
        // If "Other" is selected, ensure custom text is not empty
        if (selected.has(OTHER_OPTION_INDEX)) {
            const customText = customTexts.get(qIndex);
            return customText && customText.trim().length > 0;
        }
        return true;
    });

    const handleOptionToggle = React.useCallback((questionIndex: number, optionIndex: number, multiSelect: boolean) => {
        if (!canInteract) return;

        setSelections(prev => {
            const newMap = new Map(prev);
            const currentSet = newMap.get(questionIndex) || new Set();

            if (multiSelect) {
                // Toggle for multi-select
                const newSet = new Set(currentSet);
                if (newSet.has(optionIndex)) {
                    newSet.delete(optionIndex);
                } else {
                    newSet.add(optionIndex);
                }
                newMap.set(questionIndex, newSet);
            } else {
                // Replace for single-select
                newMap.set(questionIndex, new Set([optionIndex]));
            }

            return newMap;
        });
    }, [canInteract]);

    const handleCustomTextChange = React.useCallback((questionIndex: number, text: string) => {
        if (!canInteract) return;
        setCustomTexts(prev => {
            const newMap = new Map(prev);
            newMap.set(questionIndex, text);
            return newMap;
        });
    }, [canInteract]);

    const handleSubmit = React.useCallback(async () => {
        if (!sessionId || !allQuestionsAnswered || isSubmitting || !tool.permission?.id) return;

        setIsSubmitting(true);

        // Format answers as a map of question header to selected labels
        const answers: Record<string, string> = {};
        questions.forEach((q, qIndex) => {
            const selected = selections.get(qIndex);
            if (selected && selected.size > 0) {
                const selectedLabels: string[] = [];

                // Add predefined option labels
                Array.from(selected)
                    .filter(optIndex => optIndex !== OTHER_OPTION_INDEX)
                    .forEach(optIndex => {
                        const label = q.options[optIndex]?.label;
                        if (label) selectedLabels.push(label);
                    });

                // Add custom text if "Other" is selected
                if (selected.has(OTHER_OPTION_INDEX)) {
                    const customText = customTexts.get(qIndex)?.trim();
                    if (customText) selectedLabels.push(customText);
                }

                answers[q.header] = selectedLabels.join(', ');
            }
        });

        try {
            // Approve the permission with answers - CLI will merge answers into tool input
            await sessionAllowWithAnswers(sessionId, tool.permission.id, answers);
            setSubmittedAnswers(answers);
            setIsSubmitted(true);
        } catch (error) {
            console.error('Failed to submit answer:', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [sessionId, questions, selections, allQuestionsAnswered, isSubmitting, tool.permission?.id]);

    const styles = StyleSheet.create({
        container: {
            gap: 16,
        },
        questionSection: {
            gap: 8,
        },
        headerChip: {
            alignSelf: 'flex-start',
            backgroundColor: theme.colors.surfaceHighest,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 4,
            marginBottom: 4,
        },
        headerText: {
            fontSize: 12,
            fontWeight: '600',
            color: theme.colors.textSecondary,
            textTransform: 'uppercase',
        },
        questionText: {
            fontSize: 15,
            fontWeight: '500',
            color: theme.colors.text,
            marginBottom: 8,
        },
        optionsContainer: {
            gap: 4,
        },
        optionButton: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: theme.colors.divider,
            gap: 10,
            minHeight: 44, // Minimum touch target for mobile
        },
        optionButtonSelected: {
            backgroundColor: theme.colors.surfaceHigh,
            borderColor: theme.colors.radio.active,
        },
        optionButtonDisabled: {
            opacity: 0.6,
        },
        radioOuter: {
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: theme.colors.textSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
        },
        radioOuterSelected: {
            borderColor: theme.colors.radio.active,
        },
        radioInner: {
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: theme.colors.radio.dot,
        },
        checkboxOuter: {
            width: 20,
            height: 20,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: theme.colors.textSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
        },
        checkboxOuterSelected: {
            borderColor: theme.colors.radio.active,
            backgroundColor: theme.colors.radio.active,
        },
        optionContent: {
            flex: 1,
        },
        optionLabel: {
            fontSize: 14,
            fontWeight: '500',
            color: theme.colors.text,
        },
        optionDescription: {
            fontSize: 13,
            color: theme.colors.textSecondary,
            marginTop: 2,
        },
        actionsContainer: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 8,
            justifyContent: 'flex-end',
        },
        submitButton: {
            backgroundColor: theme.colors.button.primary.background,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            minHeight: 44, // Minimum touch target for mobile
        },
        submitButtonDisabled: {
            opacity: 0.5,
        },
        submitButtonText: {
            color: theme.colors.button.primary.tint,
            fontSize: 14,
            fontWeight: '600',
        },
        submittedContainer: {
            gap: 8,
        },
        submittedItem: {
            flexDirection: 'row',
            gap: 8,
        },
        submittedHeader: {
            fontSize: 13,
            fontWeight: '600',
            color: theme.colors.textSecondary,
        },
        submittedValue: {
            fontSize: 13,
            color: theme.colors.text,
            flex: 1,
        },
        otherInputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 4,
            marginLeft: 30, // Align with option content
        },
        otherTextInput: {
            flex: 1,
            borderWidth: 1,
            borderColor: theme.colors.divider,
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            fontSize: 14,
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
        },
        otherTextInputFocused: {
            borderColor: theme.colors.radio.active,
        },
    });

    // Parse answers from tool result if available
    // Format: "User has answered your questions: "header1"="value1", "header2"="value2". You can now..."
    const parseAnswersFromResult = React.useCallback((result: string | undefined): Record<string, string> | null => {
        if (!result) return null;
        const match = result.match(/User has answered your questions: (.+)\. You can now/);
        if (!match) return null;

        const answersStr = match[1];
        const answers: Record<string, string> = {};
        // Parse "key"="value" pairs
        const pairRegex = /"([^"]+)"="([^"]+)"/g;
        let pairMatch;
        while ((pairMatch = pairRegex.exec(answersStr)) !== null) {
            answers[pairMatch[1]] = pairMatch[2];
        }
        return Object.keys(answers).length > 0 ? answers : null;
    }, []);

    // Show submitted state
    // Priority: submittedAnswers (local) > parsed from result > tool.input.answers (from CLI) > selections state
    if (isSubmitted || tool.state === 'completed') {
        const resultAnswers = parseAnswersFromResult(tool.result);
        const inputAnswers = (tool.input as AskUserQuestionInput & { answers?: Record<string, string> })?.answers;
        const answersToShow = submittedAnswers || resultAnswers || inputAnswers;

        return (
            <ToolSectionView>
                <View style={styles.submittedContainer}>
                    {questions.map((q, qIndex) => {
                        // Get answer from stored answers or fall back to selections
                        let selectedLabels: string;
                        if (answersToShow && answersToShow[q.header]) {
                            selectedLabels = answersToShow[q.header];
                        } else {
                            const selected = selections.get(qIndex);
                            selectedLabels = selected
                                ? Array.from(selected)
                                    .map(optIndex => q.options[optIndex]?.label)
                                    .filter(Boolean)
                                    .join(', ')
                                : '-';
                        }
                        return (
                            <View key={qIndex} style={styles.submittedItem}>
                                <Text style={styles.submittedHeader}>{q.header}:</Text>
                                <Text style={styles.submittedValue}>{selectedLabels}</Text>
                            </View>
                        );
                    })}
                </View>
            </ToolSectionView>
        );
    }

    return (
        <ToolSectionView>
            <View style={styles.container}>
                {questions.map((question, qIndex) => {
                    const selectedOptions = selections.get(qIndex) || new Set();

                    return (
                        <View key={qIndex} style={styles.questionSection}>
                            <View style={styles.headerChip}>
                                <Text style={styles.headerText}>{question.header}</Text>
                            </View>
                            <Text style={styles.questionText}>{question.question}</Text>
                            <View style={styles.optionsContainer}>
                                {question.options.map((option, oIndex) => {
                                    const isSelected = selectedOptions.has(oIndex);

                                    return (
                                        <TouchableOpacity
                                            key={oIndex}
                                            style={[
                                                styles.optionButton,
                                                isSelected && styles.optionButtonSelected,
                                                !canInteract && styles.optionButtonDisabled,
                                            ]}
                                            onPress={() => handleOptionToggle(qIndex, oIndex, question.multiSelect)}
                                            disabled={!canInteract}
                                            activeOpacity={0.7}
                                        >
                                            {question.multiSelect ? (
                                                <View style={[
                                                    styles.checkboxOuter,
                                                    isSelected && styles.checkboxOuterSelected,
                                                ]}>
                                                    {isSelected && (
                                                        <Ionicons name="checkmark" size={14} color="#fff" />
                                                    )}
                                                </View>
                                            ) : (
                                                <View style={[
                                                    styles.radioOuter,
                                                    isSelected && styles.radioOuterSelected,
                                                ]}>
                                                    {isSelected && <View style={styles.radioInner} />}
                                                </View>
                                            )}
                                            <View style={styles.optionContent}>
                                                <Text style={styles.optionLabel}>{option.label}</Text>
                                                {option.description && (
                                                    <Text style={styles.optionDescription}>{option.description}</Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                {/* "Other" option with text input */}
                                <OtherOption
                                    questionIndex={qIndex}
                                    multiSelect={question.multiSelect}
                                    isSelected={selectedOptions.has(OTHER_OPTION_INDEX)}
                                    customText={customTexts.get(qIndex) || ''}
                                    canInteract={canInteract}
                                    onToggle={() => handleOptionToggle(qIndex, OTHER_OPTION_INDEX, question.multiSelect)}
                                    onTextChange={(text) => handleCustomTextChange(qIndex, text)}
                                    styles={styles}
                                    theme={theme}
                                />
                            </View>
                        </View>
                    );
                })}

                {canInteract && (
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                (!allQuestionsAnswered || isSubmitting) && styles.submitButtonDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={!allQuestionsAnswered || isSubmitting}
                            activeOpacity={0.7}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color={theme.colors.button.primary.tint} />
                            ) : (
                                <Text style={styles.submitButtonText}>{t('tools.askUserQuestion.submit')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ToolSectionView>
    );
});
