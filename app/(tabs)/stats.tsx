import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, useRef, useEffect } from 'react';
import { Colors } from '../../constants/Colors';
import { Storage, Entry } from '../../utils/storage';
import { LineChart } from 'react-native-gifted-charts';
import { FadeInView } from '../../components/FadeInView';
import { StaggeredFadeInView } from '../../components/StaggeredFadeInView';

type Period = '7d' | '30d' | '90d';

export default function StatsScreen() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [period, setPeriod] = useState<Period>('7d');
    const [displayedPeriod, setDisplayedPeriod] = useState<Period>('7d');
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const [viewKey, setViewKey] = useState(0);

    const loadData = async () => {
        const data = await Storage.getEntries();
        setEntries(data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    };

    useFocusEffect(
        useCallback(() => {
            setViewKey(k => k + 1);
            loadData();
        }, [])
    );

    // Fade animation when period changes
    useEffect(() => {
        if (period !== displayedPeriod) {
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Update the displayed period after fade-out completes
                setDisplayedPeriod(period);
                // Then fade back in after a small delay to let the chart render
                setTimeout(() => {
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                }, 50);
            });
        }
    }, [period]);

    const getFilteredEntries = (days: number) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return entries.filter(e => new Date(e.date) >= cutoff);
    };

    // Cumulative Chart Data Generation
    const getCumulativeChartData = () => {
        const days = displayedPeriod === '7d' ? 7 : displayedPeriod === '30d' ? 30 : 90;
        const filtered = getFilteredEntries(days);

        // 1. Create a map of all dates in the period initialized to 0
        const dailyMap: { [key: string]: number } = {};

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dailyMap[dateStr] = 0;
        }

        // 2. Fill in actual spending
        filtered.forEach(e => {
            const dateStr = e.date.split('T')[0];
            if (dailyMap[dateStr] !== undefined) {
                dailyMap[dateStr] += e.amountSpent;
            }
        });

        // 3. Calculate Running Total and format for Gifted Charts
        const dataPoints: { value: number, label?: string, date: string }[] = [];
        let runningTotal = 0;
        const sortedDates = Object.keys(dailyMap).sort();

        sortedDates.forEach((date, index) => {
            runningTotal += dailyMap[date];
            const d = new Date(date);

            // Add labels sparingly based on period
            let label = undefined;
            if (displayedPeriod === '7d') {
                label = d.toLocaleDateString(undefined, { weekday: 'short' });
            } else if (displayedPeriod === '30d' && index % 3 === 0) {
                label = d.toLocaleDateString(undefined, { day: 'numeric' });
            } else if (displayedPeriod === '90d' && index % 15 === 0) {
                label = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
            }

            dataPoints.push({
                value: runningTotal,
                label: label,
                date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            });
        });

        if (dataPoints.length === 0) {
            return [{ value: 0, date: new Date().toLocaleDateString() }];
        }

        return dataPoints;
    };

    const chartData = getCumulativeChartData();
    const screenWidth = Dimensions.get('window').width;

    const calculateTotal = (days: number) => {
        return getFilteredEntries(days).reduce((sum, e) => sum + e.amountSpent, 0);
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} scrollEnabled={scrollEnabled}>
                <StaggeredFadeInView key={`title-${viewKey}`} delay={0}>
                    <Text style={styles.title}>Spending Analysis</Text>
                </StaggeredFadeInView>

                {/* Period Selector */}
                <StaggeredFadeInView key={`period-${viewKey}`} delay={50}>
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
                </StaggeredFadeInView>

                {/* Main Chart */}
                <StaggeredFadeInView key={`chart-${viewKey}`} delay={100}>
                    <View style={styles.chartCard}>
                        <Text style={styles.chartTitle}>Total Spent: {calculateTotal(period === '7d' ? 7 : period === '30d' ? 30 : 90).toFixed(2).replace('.', ',')} €</Text>
                        <Animated.View
                            style={[{ opacity: fadeAnim }]}
                            onTouchStart={() => setScrollEnabled(false)}
                            onTouchEnd={() => setScrollEnabled(true)}
                        >
                            <LineChart
                                key={displayedPeriod}
                                data={chartData}
                                areaChart
                                isAnimated={false}
                                startFillColor={Colors.dark.primary}
                                startOpacity={0.8}
                                endFillColor={Colors.dark.primary}
                                endOpacity={0.3}
                                color={Colors.dark.primary}
                                thickness={3}
                                hideDataPoints={displayedPeriod !== '7d'}
                                dataPointsColor={Colors.dark.primary}
                                dataPointsRadius={4}
                                width={screenWidth - 70}
                                height={220}
                                spacing={displayedPeriod === '7d' ? (screenWidth - 110) / 7 : displayedPeriod === '30d' ? (screenWidth - 110) / 30 : (screenWidth - 110) / 90}
                                initialSpacing={10}
                                endSpacing={10}
                                noOfSections={4}
                                yAxisThickness={0}
                                xAxisThickness={0}
                                yAxisTextStyle={{ color: Colors.dark.textSecondary, fontSize: 11 }}
                                xAxisLabelTextStyle={{ color: Colors.dark.textSecondary, fontSize: displayedPeriod === '7d' ? 11 : 10, width: 40, textAlign: 'center' }}
                                yAxisLabelWidth={40}
                                hideRules
                                pointerConfig={{
                                    pointerStripHeight: 160,
                                    pointerStripColor: 'lightgray',
                                    pointerStripWidth: 2,
                                    pointerColor: 'lightgray',
                                    radius: 6,
                                    pointerLabelWidth: 100,
                                    pointerLabelHeight: 90,
                                    activatePointersOnLongPress: false,
                                    autoAdjustPointerLabelPosition: false,
                                    pointerLabelComponent: (items: any) => {
                                        return (
                                            <View
                                                style={{
                                                    height: 90,
                                                    width: 100,
                                                    justifyContent: 'center',
                                                    marginTop: -30,
                                                    marginLeft: -40,
                                                }}>
                                                <View style={{ padding: 6, borderRadius: 8, backgroundColor: '#333', opacity: 0.9 }}>
                                                    <Text style={{ color: 'white', fontSize: 10, marginBottom: 4, textAlign: 'center' }}>{items[0].date}</Text>
                                                    <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>{items[0].value.toFixed(2).replace('.', ',')} €</Text>
                                                </View>
                                            </View>
                                        );
                                    },
                                }}
                            />
                        </Animated.View>
                    </View>
                </StaggeredFadeInView>

                {/* Detailed Stats */}
                <StaggeredFadeInView key={`breakdown-${viewKey}`} delay={150}>
                    <Text style={styles.sectionTitle}>Period Breakdown</Text>
                </StaggeredFadeInView>

                <StaggeredFadeInView key={`grid-${viewKey}`} delay={200}>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>7 Days</Text>
                            <Text style={styles.statValue}>{calculateTotal(7).toFixed(2).replace('.', ',')} €</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>30 Days</Text>
                            <Text style={styles.statValue}>{calculateTotal(30).toFixed(2).replace('.', ',')} €</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>90 Days</Text>
                            <Text style={styles.statValue}>{calculateTotal(90).toFixed(2).replace('.', ',')} €</Text>
                        </View>
                    </View>
                </StaggeredFadeInView>
            </ScrollView>
        </View>
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
