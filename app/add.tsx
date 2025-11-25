import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, PanResponder, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useLanguage } from '../context/LanguageContext';
import { useThemeColor } from '../context/ThemeContext';
import { Storage } from '../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AddEntry() {
    const router = useRouter();
    const { i18n, language } = useLanguage();
    const { primaryColor } = useThemeColor();
    const params = useLocalSearchParams();
    const [category, setCategory] = useState<'Food' | 'Transportation' | 'Shopping' | 'Entertainment' | 'Other' | null>(null);
    const [step, setStep] = useState<'category' | 'form'>('category');
    const [amountSpent, setAmountSpent] = useState('');

    const [source, setSource] = useState('');
    const [type, setType] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Animation values
    const slideAnim = useRef(new Animated.Value(0)).current;
    const panX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (params.editEntry) {
            try {
                const entry = JSON.parse(params.editEntry as string);
                setCategory(entry.category);
                setStep('form');
                setAmountSpent(entry.amountSpent.toString().replace('.', ','));

                setSource(entry.source || '');
                setType(entry.type);
                setNotes(entry.notes || '');
                setDate(new Date(entry.date));
                setEditingId(entry.id);
                // Skip animation for edit mode, keep it to the right
                slideAnim.setValue(1);
            } catch (e) {
                console.error('Failed to parse edit entry', e);
            }
        }
    }, [params.editEntry, slideAnim]);

    const handleBackToCategory = useCallback(() => {
        // Animate slide back to the right
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setStep('category');
        });
    }, [slideAnim]);

    // Pan responder for swipe-to-go-back gesture
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => step === 'form',
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only respond to horizontal swipes that are moving right
                return step === 'form' && gestureState.dx > 10 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
            },
            onPanResponderGrant: () => {
                panX.setOffset(0);
            },
            onPanResponderMove: (_, gestureState) => {
                // Only allow swiping to the right (positive dx)
                if (gestureState.dx > 0) {
                    panX.setValue(gestureState.dx);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const threshold = SCREEN_WIDTH * 0.3; // 30% of screen width
                if (gestureState.dx > threshold && gestureState.vx > 0) {
                    // Swipe was far enough, go back to category
                    Animated.timing(panX, {
                        toValue: SCREEN_WIDTH,
                        duration: 250,
                        useNativeDriver: true,
                    }).start(() => {
                        handleBackToCategory();
                        panX.setValue(0);
                    });
                } else {
                    // Swipe not far enough, return to original position
                    Animated.spring(panX, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 65,
                        friction: 10,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                // Reset if gesture is interrupted
                Animated.spring(panX, {
                    toValue: 0,
                    useNativeDriver: true,
                }).start();
            },
        })
    ).current;

    const handleCategorySelect = useCallback((selectedCategory: 'Food' | 'Transportation' | 'Shopping' | 'Entertainment' | 'Other') => {
        setCategory(selectedCategory);
        setStep('form');
        // Animate slide to the left
        Animated.timing(slideAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [slideAnim]);

    const getLabels = useCallback(() => {
        return { type: i18n.t('addEntry.itemName') };
    }, [i18n]);

    const handleSaveFavorite = useCallback(async () => {
        // Validation
        if (!amountSpent || !type) {
            Alert.alert(i18n.t('common.error'), i18n.t('addEntry.requiredFields'));
            return;
        }


        try {
            await Storage.addFavorite({
                amountSpent: parseFloat(amountSpent.replace(',', '.')),
                source: source || '',
                type,
                category: category!,
                notes,
            });
            Alert.alert(i18n.t('common.success'), i18n.t('addEntry.favoriteAdded'));
        } catch (e: any) {
            if (e.message === 'Max favorites reached') {
                Alert.alert(i18n.t('common.error'), i18n.t('addEntry.maxFavorites'));
            } else {
                Alert.alert(i18n.t('common.error'), i18n.t('addEntry.failedSaveFavorite'));
            }
        }
    }, [amountSpent, type, category, source, notes, i18n]);

    const handleSave = useCallback(async () => {
        // Validation
        if (!amountSpent || !type) {
            Alert.alert(i18n.t('common.error'), i18n.t('addEntry.requiredFields'));
            return;
        }


        try {
            if (editingId) {
                await Storage.updateEntry({
                    id: editingId,
                    date: date.toISOString(),
                    amountSpent: parseFloat(amountSpent.replace(',', '.')),
                    source: source || '',
                    type,
                    category: category!,
                    notes,
                });
            } else {
                await Storage.addEntry({
                    date: date.toISOString(),
                    amountSpent: parseFloat(amountSpent.replace(',', '.')),
                    source: source || '',
                    type,
                    category: category!,
                    notes,
                });
            }
            router.back();
        } catch (e) {
            Alert.alert(i18n.t('common.error'), i18n.t('addEntry.failedSaveEntry'));
        }
    }, [amountSpent, type, category, source, notes, date, editingId, i18n, router]);

    const onChangeDate = useCallback((event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setDate(currentDate);
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
    }, [date]);

    const labels = getLabels();

    // Calculate transforms for sliding animation
    const categoryTranslate = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -SCREEN_WIDTH],
    });

    const formTranslate = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_WIDTH, 0],
    });

    return (
        <View style={styles.container}>
            {/* Category Selection Screen */}
            <Animated.View
                style={[
                    styles.screenContainer,
                    {
                        transform: [{ translateX: categoryTranslate }],
                    }
                ]}
                pointerEvents={step === 'category' ? 'auto' : 'none'}
            >
                <View style={styles.categoryContainer}>
                    <Text style={styles.headerTitle}>{editingId ? i18n.t('addEntry.editTitle') : i18n.t('addEntry.selectCategory')}</Text>
                    {['Food', 'Transportation', 'Shopping', 'Entertainment', 'Other'].map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={styles.categoryButton}
                            onPress={() => handleCategorySelect(cat as any)}
                        >
                            <Text style={styles.categoryButtonText}>{i18n.t(`categories.${cat}`)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Animated.View>

            {/* Form Screen */}
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.screenContainer,
                    {
                        transform: [
                            { translateX: Animated.add(formTranslate, panX) }
                        ],
                    }
                ]}
                pointerEvents={step === 'form' ? 'auto' : 'none'}
            >
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                    <TouchableOpacity onPress={handleBackToCategory} style={styles.backToCategory}>
                        <Text style={[styles.backToCategoryText, { color: primaryColor }]}>← {i18n.t('addEntry.changeCategory')} ({i18n.t(`categories.${category}`)})</Text>
                    </TouchableOpacity>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>{i18n.t('addEntry.date')}</Text>
                        <View style={styles.dateContainer}>
                            {Platform.OS === 'ios' ? (
                                <View style={styles.dateButton}>
                                    <Text style={styles.dateButtonText}>{date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}</Text>
                                    <DateTimePicker
                                        testID="dateTimePicker"
                                        value={date}
                                        mode="date"
                                        display="compact"
                                        onChange={onChangeDate}
                                        themeVariant="dark"
                                        style={styles.invisibleDatePicker}
                                    />
                                </View>
                            ) : (
                                <>
                                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                                        <Text style={styles.dateButtonText}>{date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}</Text>
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            testID="dateTimePicker"
                                            value={date}
                                            mode="date"
                                            is24Hour={true}
                                            display="default"
                                            onChange={onChangeDate}
                                            themeVariant="dark"
                                        />
                                    )}
                                </>
                            )}
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>{i18n.t('addEntry.amountSpent')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0,00 €"
                            placeholderTextColor={Colors.dark.textSecondary}
                            keyboardType="decimal-pad"
                            value={amountSpent}
                            onChangeText={setAmountSpent}
                        />
                    </View>



                    <View style={styles.formGroup}>
                        <Text style={styles.label}>{labels.type}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Details..."
                            placeholderTextColor={Colors.dark.textSecondary}
                            value={type}
                            onChangeText={setType}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>{i18n.t('addEntry.source')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Store, Friend, etc."
                            placeholderTextColor={Colors.dark.textSecondary}
                            value={source}
                            onChangeText={setSource}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>{i18n.t('addEntry.notes')}</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Any other details..."
                            placeholderTextColor={Colors.dark.textSecondary}
                            multiline
                            numberOfLines={4}
                            value={notes}
                            onChangeText={setNotes}
                        />
                    </View>

                    <TouchableOpacity style={styles.favoriteButton} onPress={handleSaveFavorite}>
                        <Text style={styles.favoriteButtonText}>{i18n.t('addEntry.saveFavorite')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.saveButton, { backgroundColor: primaryColor, shadowColor: primaryColor }]} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>{editingId ? i18n.t('addEntry.updateEntry') : i18n.t('addEntry.saveEntry')}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        overflow: 'hidden',
    },
    screenContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: SCREEN_WIDTH,
        backgroundColor: Colors.dark.background,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        color: Colors.dark.text,
        fontSize: 16,
        marginBottom: 8,
        fontWeight: '600',
    },
    input: {
        backgroundColor: Colors.dark.surface,
        color: Colors.dark.text,
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: Colors.dark.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: Colors.dark.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    saveButtonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    favoriteButton: {
        backgroundColor: '#FFD700', // Gold
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    favoriteButtonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateButton: {
        backgroundColor: Colors.dark.surface,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        flex: 1,
    },
    dateButtonText: {
        color: Colors.dark.text,
        fontSize: 16,
    },
    categoryContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        gap: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.dark.text,
        textAlign: 'center',
        marginBottom: 32,
    },
    categoryButton: {
        backgroundColor: Colors.dark.surface,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    categoryButtonText: {
        color: Colors.dark.text,
        fontSize: 18,
        fontWeight: '600',
    },
    backToCategory: {
        marginBottom: 20,
    },
    backToCategoryText: {
        color: Colors.dark.primary,
        fontSize: 16,
    },
    invisibleDatePicker: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        opacity: 0.011,
    },
});
