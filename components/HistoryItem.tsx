import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Entry } from '../utils/storage';

interface HistoryItemProps {
    item: Entry;
    onDelete: (id: string) => void;
}

export default function HistoryItem({ item, onDelete }: HistoryItemProps) {
    const swipeableRef = useRef<Swipeable>(null);
    const rowHeight = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    const renderRightActions = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        const trans = dragX.interpolate({
            inputRange: [0, 50, 100, 101],
            outputRange: [-20, 0, 0, 1],
        });

        return (
            <View style={styles.deleteAction}>
                <Animated.Text
                    style={{
                        transform: [{ translateX: trans }],
                    }}
                >
                    <Ionicons name="trash" size={24} color="white" />
                </Animated.Text>
            </View>
        );
    };

    const handleSwipeOpen = () => {
        // Auto-close immediately
        swipeableRef.current?.close();

        Alert.alert(
            'Delete Entry',
            'Are you sure you want to delete this entry?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
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
                        outputRange: [0, 100], // Approximate max height
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
                <View style={styles.item}>
                    <View>
                        <Text style={styles.itemCategory}>{item.category || 'Weed'}</Text>
                        <Text style={styles.itemType}>{item.type}</Text>
                        <Text style={styles.itemSource}>{item.source}</Text>
                        <Text style={styles.itemDate}>{new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.itemPrice}>{item.amountSpent.toFixed(2).replace('.', ',')} €</Text>
                        {item.category === 'Weed' && (
                            <Text style={styles.itemGrams}>{item.grams}g</Text>
                        )}
                    </View>
                </View>
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
        color: Colors.dark.primary,
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
});
