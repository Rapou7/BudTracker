import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Colors } from '../constants/Colors';
import { useLanguage } from '../context/LanguageContext';
import { useThemeColor } from '../context/ThemeContext';
import { Entry } from '../utils/storage';

interface HistoryItemProps {
    item: Entry;
    onDelete: (id: string) => void;
    onPress: () => void;
}

export default function HistoryItem({ item, onDelete, onPress }: HistoryItemProps) {
    const { i18n, language } = useLanguage();
    const { primaryColor } = useThemeColor();
    const swipeableRef = useRef<Swipeable>(null);
    const rowHeight = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    const renderRightActions = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        const trans = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [0, 80],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.deleteAction}>
                <Animated.View
                    style={{
                        transform: [{ translateX: trans }],
                    }}
                >
                    <Ionicons name="trash" size={24} color="white" />
                </Animated.View>
            </View>
        );
    };

    const handleSwipeOpen = () => {
        // Auto-close immediately
        swipeableRef.current?.close();

        Alert.alert(
            i18n.t('common.delete'),
            i18n.t('dashboard.removeFavoriteConfirm'), // Reusing confirm message or add specific one
            [
                {
                    text: i18n.t('common.cancel'),
                    style: 'cancel',
                },
                {
                    text: i18n.t('common.delete'),
                    style: 'destructive',
                    onPress: () => {
                        // Animate out
                        Animated.parallel([
                            Animated.timing(opacity, {
                                toValue: 0,
                                duration: 300,
                                useNativeDriver: false,
                            }),
                            Animated.timing(rowHeight, {
                                toValue: 0,
                                duration: 300,
                                useNativeDriver: false,
                            }),
                        ]).start(() => {
                            onDelete(item.id);
                        });
                    },
                },
            ]
        );
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity,
                    maxHeight: rowHeight.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 500], // Increased to accommodate notes
                    }),
                    transform: [{ scaleY: rowHeight }]
                }
            ]}
        >
            <Swipeable
                ref={swipeableRef}
                renderRightActions={renderRightActions}
                onSwipeableOpen={handleSwipeOpen}
                rightThreshold={40}
                containerStyle={styles.swipeableContainer}
            >
                <TouchableHighlight
                    activeOpacity={0.6}
                    underlayColor="#333333"
                    onPress={onPress}
                    style={{ borderRadius: 12 }}
                >
                    <View style={{ backgroundColor: Colors.dark.surface }}>
                        <View style={[styles.item, item.notes ? { paddingBottom: 4 } : null]}>
                            <View>
                                <Text style={[styles.itemCategory, { color: primaryColor }]}>{i18n.t(`categories.${item.category || 'Weed'}`)}</Text>
                                <Text style={styles.itemType}>{item.type}</Text>
                                {item.source && (
                                    <Text style={styles.itemSource}>{i18n.t('common.source')}: {item.source}</Text>
                                )}
                                <Text style={styles.itemDate}>{new Date(item.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.itemPrice, { color: primaryColor }]}>{item.amountSpent.toFixed(2).replace('.', ',')} €</Text>
                                {item.category === 'Weed' && (
                                    <Text style={styles.itemGrams}>{item.grams}g</Text>
                                )}
                            </View>
                        </View>
                        {item.notes && (
                            <View style={styles.notesContainer}>
                                <Text style={styles.itemNotes} numberOfLines={2}>{i18n.t('common.note')}: {item.notes}</Text>
                            </View>
                        )}
                    </View>
                </TouchableHighlight>
            </Swipeable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: Colors.dark.surface,
    },
    swipeableContainer: {
        backgroundColor: '#dd2c00',
    },
    item: {
        backgroundColor: Colors.dark.surface,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemCategory: {
        color: Colors.dark.primary, // Keeping this static or should it be dynamic? Let's use dynamic inline style if needed, but here it's static style.
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    itemType: {
        color: Colors.dark.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    itemSource: {
        color: Colors.dark.textSecondary,
        fontSize: 14,
    },
    itemDate: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
        marginTop: 4,
    },
    itemPrice: {
        color: Colors.dark.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    itemGrams: {
        color: Colors.dark.text,
        fontSize: 14,
    },
    deleteAction: {
        backgroundColor: '#dd2c00',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    },
    notesContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: Colors.dark.surface,
    },
    itemNotes: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
    },
});
