import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Colors } from '../../constants/Colors';
import { Storage, Entry } from '../../utils/storage';
import { LineChart } from 'react-native-chart-kit';

type Period = '7d' | '30d' | '90d';

export default function StatsScreen() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [period, setPeriod] = useState<Period>('7d');

    const loadData = async () => {
        const data = await Storage.getEntries();
        setEntries(data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const getFilteredEntries = (days: number) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return entries.filter(e => new Date(e.date) >= cutoff);
    };

    // Cumulative Chart Data Generation
    const getCumulativeChartData = () => {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const filtered = getFilteredEntries(days);

        // 1. Create a map of all dates in the period initialized to 0
        const dailyMap: { [key: string]: number } = {};
        const labels: string[] = [];

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dailyMap[dateStr] = 0;

            // Add labels sparingly
            if (period === '7d' || (period === '30d' && i % 5 === 0) || (period === '90d' && i % 15 === 0)) {
                labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
            } else {
                labels.push('');
            }
        }

        // 2. Fill in actual spending
        filtered.forEach(e => {
            const dateStr = e.date.split('T')[0];
            if (dailyMap[dateStr] !== undefined) {
                dailyMap[dateStr] += e.amountSpent;
            }
        });

        // 3. Calculate Running Total
        const dataPoints: number[] = [];
        let runningTotal = 0;
        const sortedDates = Object.keys(dailyMap).sort();

        sortedDates.forEach(date => {
            runningTotal += dailyMap[date];
            dataPoints.push(runningTotal);
        });

        return {
            labels: labels.filter((_, i) => {
                // Filter labels to match the data points length but keep visual sparsity
                return true;
            }),
            datasets: [{
                data: dataPoints.length > 0 ? dataPoints : [0],
                color: (opacity = 1) => `rgba(187, 134, 252, ${opacity})`,
                strokeWidth: 2
            }]
        };
    };

    const chartData = getCumulativeChartData();
    const screenWidth = Dimensions.get('window').width;

    const calculateTotal = (days: number) => {
        return getFilteredEntries(days).reduce((sum, e) => sum + e.amountSpent, 0);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Spending Analysis</Text>

            {/* Period Selector */}
            <View style={styles.periodSelector}>
                {(['7d', '30d', '90d'] as Period[]).map((p) => (
                    <TouchableOpacity
                        key={p}
                        style={[styles.periodButton, period === p && styles.periodButtonActive]}
                        onPress={() => setPeriod(p)}
                    >
                        <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
                            {p.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Main Chart */}
            <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Total Spent: ${calculateTotal(period === '7d' ? 7 : period === '30d' ? 30 : 90).toFixed(2)}</Text>
                <LineChart
                    data={chartData}
                    width={screenWidth - 40}
                    height={220}
                    chartConfig={{
                        backgroundColor: Colors.dark.surface,
                        backgroundGradientFrom: Colors.dark.surface,
                        backgroundGradientTo: Colors.dark.surface,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(187, 134, 252, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        propsForDots: {
                            r: period === '7d' ? "6" : "0", // Hide dots for 30d/90d
                            strokeWidth: "2",
                            stroke: "#BB86FC"
                        },
                        propsForBackgroundLines: {
                            strokeDasharray: "", // Solid lines
                            stroke: Colors.dark.border,
                        }
                    }}
                    bezier
                    style={{
                        marginVertical: 8,
                        borderRadius: 16
                    }}
                    withDots={period === '7d'}
                />
            </View>

            {/* Detailed Stats */}
            <Text style={styles.sectionTitle}>Period Breakdown</Text>
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>7 Days</Text>
                    <Text style={styles.statValue}>${calculateTotal(7).toFixed(0)}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>30 Days</Text>
                    <Text style={styles.statValue}>${calculateTotal(30).toFixed(0)}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>90 Days</Text>
                    <Text style={styles.statValue}>${calculateTotal(90).toFixed(0)}</Text>
                </View>
            </View>
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
        paddingTop: 60,
    },
    title: {
        color: Colors.dark.text,
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    periodSelector: {
        flexDirection: 'row',
        backgroundColor: '#2C2C2E', // Lighter than background
        borderRadius: 16,
        padding: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    periodButtonActive: {
        backgroundColor: Colors.dark.primary,
        shadowColor: Colors.dark.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    periodButtonText: {
        color: Colors.dark.textSecondary,
        fontWeight: '600',
        fontSize: 14,
    },
    periodButtonTextActive: {
        color: '#000',
        fontWeight: 'bold',
    },
    chartCard: {
        backgroundColor: Colors.dark.surface,
        borderRadius: 24,
        padding: 16,
        marginBottom: 32,
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    chartTitle: {
        color: Colors.dark.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        alignSelf: 'flex-start',
        marginLeft: 8
    },
    sectionTitle: {
        color: Colors.dark.text,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    statCard: {
        backgroundColor: Colors.dark.surface,
        borderRadius: 16,
        padding: 16,
        width: '31%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    statLabel: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statValue: {
        color: Colors.dark.text,
        fontSize: 20,
        fontWeight: 'bold'
    }
});
