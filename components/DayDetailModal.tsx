import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Modal, Platform, ScrollView, StyleSheet, Text, TouchableHighlight, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { CategoryColors, Colors } from '../constants/Colors';
import { useLanguage } from '../context/LanguageContext';
import { useThemeColor } from '../context/ThemeContext';
import { Entry } from '../utils/storage';

interface DayDetailModalProps {
    visible: boolean;
    date: Date | null;
    entries: Entry[];
    position?: { x: number; y: number } | null;
    onClose: () => void;
    onDeleteEntry: (id: string) => void;
    onEditEntry: (entry: Entry) => void;
}

interface SwipeableEntryItemProps {
    entry: Entry;
    onDelete: (id: string) => void;
    onPress: () => void;
}

function getCategoryColor(category: string, primaryColor: string): string {
    return CategoryColors[category as keyof typeof CategoryColors] || primaryColor;
}

function SwipeableEntryItem({ entry, onDelete, onPress }: SwipeableEntryItemProps) {
    const { i18n } = useLanguage();
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
        swipeableRef.current?.close();

        Alert.alert(
            i18n.t('common.delete'),
            `${i18n.t('common.delete')} ${entry.type} (${entry.amountSpent.toFixed(2).replace('.', ',')} €)?`,
            [
                {
                    text: i18n.t('common.cancel'),
                    style: 'cancel',
                },
                {
                    text: i18n.t('common.delete'),
                    style: 'destructive',
                    onPress: () => {
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
                            onDelete(entry.id);
                        });
                    },
                },
            ]
        );
    };

    return (
        <Animated.View
            style={[
                styles.entryWrapper,
                {
                    opacity,
                    maxHeight: rowHeight.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 100],
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
                    style={styles.touchableHighlight}
                >
                    <View style={styles.entryItem}>
                        <View style={styles.entryContent}>
                            <View style={styles.entryHeader}>
                                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(entry.category, primaryColor) }]}>
                                    <Text style={styles.categoryText}>{i18n.t(`categories.${entry.category}`)}</Text>
                                </View>
                                <Text style={styles.entryType} numberOfLines={1}>{entry.type}</Text>
                            </View>
                            <View style={styles.entryDetails}>
                                <Text style={[styles.entryAmount, { color: primaryColor }]}>
                                    {entry.amountSpent.toFixed(2).replace('.', ',')} €
                                </Text>
                                {entry.category === 'Weed' && (
                                    <Text style={styles.entryGrams}>{entry.grams}g</Text>
                                )}
                            </View>
                            {entry.source && (
                                <Text style={styles.entrySource} numberOfLines={1}>{i18n.t('common.source')}: {entry.source}</Text>
                            )}
                            {entry.notes && (
                                <Text style={styles.entryNotes} numberOfLines={2}>{i18n.t('common.note')}: {entry.notes}</Text>
                            )}
                        </View>
                    </View>
                </TouchableHighlight>
            </Swipeable>
        </Animated.View>
    );
}

export default function DayDetailModal({ visible, date, entries, position, onClose, onDeleteEntry, onEditEntry }: DayDetailModalProps) {
    const { i18n, language } = useLanguage();
    const { primaryColor } = useThemeColor();
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [localEntries, setLocalEntries] = useState<Entry[]>(entries);

    useEffect(() => {
        setLocalEntries(entries);
    }, [entries]);

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            slideAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleDeleteEntry = (id: string) => {
        setLocalEntries(prev => prev.filter(e => e.id !== id));
        onDeleteEntry(id);
    };

    const totalSpent = useMemo(() => localEntries.reduce((sum, e) => sum + e.amountSpent, 0), [localEntries]);

    if (!date) return null;

    const formatDate = (d: Date) => {
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const locale = language === 'es' ? 'es-ES' : 'en-US';
        let dateString = d.toLocaleDateString(locale, options);

        if (language === 'es') {
            return dateString.split(' ').map((word, index) => {
                if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
                if (['de', 'del', 'el', 'la', 'en'].includes(word.toLowerCase())) return word.toLowerCase();
                return word.charAt(0).toUpperCase() + word.slice(1);
            }).join(' ');
        }

        return dateString;
    };

    const screenHeight = Dimensions.get('window').height;
    const screenWidth = Dimensions.get('window').width;

    const startY = position ? position.y : screenHeight / 2;
    const startX = position ? position.x : screenWidth / 2;

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [startY - screenHeight / 2, 0],
    });

    const translateX = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [startX - screenWidth / 2, 0],
    });

    const scale = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.1, 1],
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={handleClose}
                />
                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            opacity: fadeAnim,
                            transform: [
                                { translateY },
                                { translateX },
                                { scale },
                            ],
                        },
                    ]}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    <View style={styles.header}>
                        <Text style={styles.dateText}>{formatDate(date)}</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {localEntries.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>{i18n.t('dashboard.noEntries')}</Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryLabel}>{i18n.t('dashboard.totalSpent')}</Text>
                                <Text style={[styles.summaryValue, { color: primaryColor }]}>
                                    {totalSpent.toFixed(2).replace('.', ',')} €
                                </Text>
                            </View>

                            <Text style={styles.listTitle}>{i18n.t('dashboard.recentHistory')} ({localEntries.length})</Text>
                            <GestureHandlerRootView style={styles.gestureHandlerContainer}>
                                <ScrollView
                                    style={styles.entriesList}
                                    showsVerticalScrollIndicator={true}
                                    nestedScrollEnabled={true}
                                    scrollEventThrottle={16}
                                    bounces={Platform.OS === 'ios'}
                                >
                                    {localEntries.map((entry) => (
                                        <SwipeableEntryItem
                                            key={entry.id}
                                            entry={entry}
                                            onDelete={handleDeleteEntry}
                                            onPress={() => onEditEntry(entry)}
                                        />
                                    ))}
                                </ScrollView>
                            </GestureHandlerRootView>
                        </>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: Colors.dark.surface,
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    dateText: {
        color: Colors.dark.text,
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.dark.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: Colors.dark.text,
        fontSize: 20,
        fontWeight: 'bold',
    },
    summaryCard: {
        backgroundColor: Colors.dark.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
    },
    summaryLabel: {
        color: Colors.dark.textSecondary,
        fontSize: 14,
        marginBottom: 4,
    },
    summaryValue: {
        color: Colors.dark.primary,
        fontSize: 28,
        fontWeight: 'bold',
    },
    listTitle: {
        color: Colors.dark.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    gestureHandlerContainer: {
        maxHeight: 300,
    },
    entriesList: {
        maxHeight: 300,
    },
    entryWrapper: {
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: Colors.dark.background,
    },
    swipeableContainer: {
        backgroundColor: '#dd2c00',
    },
    touchableHighlight: {
        borderRadius: 12,
    },
    entryItem: {
        flexDirection: 'row',
        backgroundColor: Colors.dark.background,
        padding: 12,
        alignItems: 'center',
    },
    entryContent: {
        flex: 1,
    },
    entryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 8,
    },
    categoryText: {
        color: '#000',
        fontSize: 12,
        fontWeight: 'bold',
    },
    entryType: {
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    entryDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    entryAmount: {
        color: Colors.dark.primary,
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 12,
    },
    entryGrams: {
        color: Colors.dark.textSecondary,
        fontSize: 14,
    },
    entrySource: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
    },
    entryNotes: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 2,
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.dark.textSecondary,
        fontSize: 16,
    },
    deleteAction: {
        backgroundColor: '#dd2c00',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    },
});