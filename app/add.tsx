import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Colors } from '../constants/Colors';
import { Storage } from '../utils/storage';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddEntry() {
    const router = useRouter();
    const [category, setCategory] = useState<'Alcohol' | 'Tobacco' | 'Weed' | 'Other' | null>(null);
    const [step, setStep] = useState<'category' | 'form'>('category');
    const [amountSpent, setAmountSpent] = useState('');
    const [grams, setGrams] = useState('');
    const [source, setSource] = useState('');
    const [type, setType] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleCategorySelect = (selectedCategory: 'Alcohol' | 'Tobacco' | 'Weed' | 'Other') => {
        setCategory(selectedCategory);
        setStep('form');
    };

    const getLabels = () => {
        switch (category) {
            case 'Alcohol':
                return { amount: 'Units (Drinks)', type: 'Type (Beer, Wine, etc.)' };
            case 'Tobacco':
                return { amount: 'Amount (Packs/Grams)', type: 'Type (Brand)' };
            case 'Other':
                return { amount: 'Amount', type: 'Type' };
            case 'Weed':
            default:
                return { amount: 'Grams (g)', type: 'Type (Strain/Type)' };
        }
    };

    const handleSaveFavorite = async () => {
        if (!amountSpent || !grams || !source || !type) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            await Storage.addFavorite({
                amountSpent: parseFloat(amountSpent),
                grams: parseFloat(grams),
                source,
                type,
                category: category!,
                notes,
            });
            Alert.alert('Success', 'Added to favorites!');
        } catch (e: any) {
            if (e.message === 'Max favorites reached') {
                Alert.alert('Error', 'You can only have up to 6 favorites. Long press a favorite on the dashboard to remove it.');
            } else {
                Alert.alert('Error', 'Failed to save favorite');
            }
        }
    };

    const handleSave = async () => {
        if (!amountSpent || !grams || !source || !type) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            await Storage.addEntry({
                date: date.toISOString(),
                amountSpent: parseFloat(amountSpent),
                grams: parseFloat(grams),
                source,
                type,
                category: category!,
                notes,
            });
            router.back();
        } catch (e) {
            Alert.alert('Error', 'Failed to save entry');
        }
    };

    const onChangeDate = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    if (step === 'category') {
        return (
            <View style={styles.container}>
                <View style={styles.categoryContainer}>
                    <Text style={styles.headerTitle}>Select Category</Text>
                    {['Alcohol', 'Tobacco', 'Weed', 'Other'].map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={styles.categoryButton}
                            onPress={() => handleCategorySelect(cat as any)}
                        >
                            <Text style={styles.categoryButtonText}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    }

    const labels = getLabels();

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <TouchableOpacity onPress={() => setStep('category')} style={styles.backToCategory}>
                <Text style={styles.backToCategoryText}>← Change Category ({category})</Text>
            </TouchableOpacity>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Date</Text>
                <View style={styles.dateContainer}>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                        <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
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
                </View>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Amount Spent ($)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={Colors.dark.textSecondary}
                    keyboardType="numeric"
                    value={amountSpent}
                    onChangeText={setAmountSpent}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>{labels.amount}</Text>
                <TextInput
                    style={styles.input}
                    placeholder="0.0"
                    placeholderTextColor={Colors.dark.textSecondary}
                    keyboardType="numeric"
                    value={grams}
                    onChangeText={setGrams}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Source (Where did you get it?)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Store, Friend, etc."
                    placeholderTextColor={Colors.dark.textSecondary}
                    value={source}
                    onChangeText={setSource}
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
                <Text style={styles.label}>Notes (Optional)</Text>
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
                <Text style={styles.favoriteButtonText}>★ Save as Favorite</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save Entry</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
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
});
