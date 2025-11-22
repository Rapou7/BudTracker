import React, { useMemo } from 'react';
import { View, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';
import { Colors } from '../constants/Colors';

interface HeatmapProps {
    entries: { date: string; amountSpent: number }[];
    numDays?: number;
    endDate?: Date;
    onDayPress?: (date: Date, dayEntries: any[], position: { x: number; y: number }) => void;
}

export default function Heatmap({ entries, numDays = 91, endDate = new Date(), onDayPress }: HeatmapProps) {
    const screenWidth = Dimensions.get('window').width;
    const gutter = 4;
    const padding = 64; // Total horizontal padding (Screen padding 32 + Card padding 32)

    // Calculate start date and its day of the week
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (numDays - 1));
    const startDay = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate number of weeks to show, accounting for the offset
    const numWeeks = Math.ceil((numDays + startDay) / 7);

    // Calculate cell size to fit screen
    // availableWidth = numWeeks * cellSize + (numWeeks - 1) * gutter
    // cellSize = (availableWidth - (numWeeks - 1) * gutter) / numWeeks
    const availableWidth = screenWidth - padding;
    const cellSize = (availableWidth - (numWeeks - 1) * gutter) / numWeeks;

    const { cells, maxSpend } = useMemo(() => {
        const data: { [key: string]: { amount: number; entries: any[] } } = {};
        let max = 0;

        entries.forEach(e => {
            const dateStr = e.date.split('T')[0];
            if (!data[dateStr]) {
                data[dateStr] = { amount: 0, entries: [] };
            }
            data[dateStr].amount += e.amountSpent;
            data[dateStr].entries.push(e);
            if (data[dateStr].amount > max) max = data[dateStr].amount;
        });

        const result = [];
        // Start from (numDays - 1) days ago
        for (let i = numDays - 1; i >= 0; i--) {
            const d = new Date(endDate);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayData = data[dateStr] || { amount: 0, entries: [] };

            result.push({
                date: d,
                amount: dayData.amount,
                entries: dayData.entries,
                intensity: max > 0 ? dayData.amount / max : 0,
            });
        }
        return { cells: result, maxSpend: max };
    }, [entries, numDays, endDate]);

    const gridCells = cells.map((cell, index) => {
        // Calculate column (week) and row (day of week) based on the start offset
        const globalIndex = index + startDay;
        const col = Math.floor(globalIndex / 7);
        const row = globalIndex % 7;

        return {
            ...cell,
            x: col * (cellSize + gutter),
            y: row * (cellSize + gutter),
        };
    });

    // Calculate total width/height
    const width = numWeeks * (cellSize + gutter) - gutter;
    const height = 7 * (cellSize + gutter) - gutter;

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Svg width={width} height={height}>
                {gridCells.map((cell, index) => {
                    let fill = Colors.dark.surface;
                    let opacity = 1;

                    if (cell.amount > 0) {
                        fill = '#00E676'; // Bright Green
                        // Make it glow: minimum 0.3 opacity so it's visible, up to 1.0
                        opacity = 0.3 + (0.7 * cell.intensity);
                    } else {
                        fill = '#2C2C2E'; // Slightly lighter than background for empty cells
                    }

                    return (
                        <Rect
                            key={index}
                            x={cell.x}
                            y={cell.y}
                            width={cellSize}
                            height={cellSize}
                            rx={4} // Fixed radius for cleaner look
                            ry={4}
                            fill={fill}
                            fillOpacity={opacity}
                        />
                    );
                })}
            </Svg>
            {/* Overlay touchable areas */}
            <View style={{ position: 'absolute', width, height }}>
                {gridCells.map((cell, index) => (
                    <TouchableOpacity
                        key={index}
                        style={{
                            position: 'absolute',
                            left: cell.x,
                            top: cell.y,
                            width: cellSize,
                            height: cellSize,
                        }}
                        onPress={(e) => {
                            if (onDayPress) {
                                // Use pageX/pageY for absolute screen coordinates
                                onDayPress(cell.date, cell.entries, {
                                    x: e.nativeEvent.pageX - (cellSize / 2),
                                    y: e.nativeEvent.pageY - (cellSize / 2)
                                });
                            }
                        }}
                        activeOpacity={0.7}
                    />
                ))}
            </View>
        </View>
    );
}
