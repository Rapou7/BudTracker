import React, { useCallback, useMemo } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { CategoryColors } from '../constants/Colors';
import { useThemeColor } from '../context/ThemeContext';

interface HeatmapProps {
    entries: any[];
    numDays?: number;
    endDate?: Date;
    onDayPress?: (date: Date, dayEntries: any[], position: { x: number; y: number }) => void;
}

function getCategoryColor(category: string, primaryColor: string): string {
    return CategoryColors[category as keyof typeof CategoryColors] || primaryColor;
}

// Stateless heatmap cell: renders fill, and (optionally) secondary as stroke outline if two+ categories
const HeatmapCell = React.memo(({
    x,
    y,
    cellSize,
    categories,
    intensity,
    primaryColor,
}: {
    x: number;
    y: number;
    cellSize: number;
    categories: string[];
    intensity: number;
    primaryColor: string;
}) => {
    if (categories.length === 0) {
        return (
            <Rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={4}
                ry={4}
                fill="#2C2C2E"
                fillOpacity={1}
            />
        );
    }

    const fillColor = getCategoryColor(categories[0], primaryColor);
    const opacity = 0.3 + (0.7 * intensity);

    if (categories.length === 1) {
        return (
            <Rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={4}
                ry={4}
                fill={fillColor}
                fillOpacity={opacity}
            />
        );
    }

    // For two+ categories: draw primary as fill, secondary as inside outline (same opacity, same radius)
    const strokeColor = getCategoryColor(categories[1], primaryColor);
    const strokeWidth = 2;
    const inset = strokeWidth / 2; // So stroke is fully inside
    const outlineRadius = 4; // Matches main fill

    return (
        <>
            <Rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={4}
                ry={4}
                fill={fillColor}
                fillOpacity={opacity}
            />
            <Rect
                x={x + inset}
                y={y + inset}
                width={cellSize - strokeWidth}
                height={cellSize - strokeWidth}
                rx={outlineRadius}
                ry={outlineRadius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeOpacity={opacity}
            />
        </>
    );
});

export default function Heatmap({ entries, numDays = 91, endDate = new Date(), onDayPress }: HeatmapProps) {
    const { primaryColor } = useThemeColor();
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
    const availableWidth = screenWidth - padding;
    const cellSize = (availableWidth - (numWeeks - 1) * gutter) / numWeeks;

    const { cells } = useMemo(() => {
        const data: { [key: string]: { amount: number; entries: any[]; categories: Set<string> } } = {};
        let max = 0;

        entries.forEach(e => {
            const dateStr = e.date.split('T')[0];
            if (!data[dateStr]) {
                data[dateStr] = { amount: 0, entries: [], categories: new Set() };
            }
            data[dateStr].amount += e.amountSpent;
            data[dateStr].entries.push(e);

            // Track unique categories
            const cat = e.category || 'Other';
            data[dateStr].categories.add(cat);

            if (data[dateStr].amount > max) max = data[dateStr].amount;
        });

        const result = [];
        // Start from (numDays - 1) days ago
        for (let i = numDays - 1; i >= 0; i--) {
            const d = new Date(endDate);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayData = data[dateStr] || { amount: 0, entries: [], categories: new Set() };

            result.push({
                date: d,
                amount: dayData.amount,
                entries: dayData.entries,
                intensity: max > 0 ? dayData.amount / max : 0,
                categories: Array.from(dayData.categories),
            });
        }
        return { cells: result, maxSpend: max };
    }, [entries, numDays, endDate]);

    const gridCells = useMemo(() => cells.map((cell, index) => {
        // Calculate column (week) and row (day of week) based on the start offset
        const globalIndex = index + startDay;
        const col = Math.floor(globalIndex / 7);
        const row = globalIndex % 7;

        return {
            ...cell,
            x: col * (cellSize + gutter),
            y: row * (cellSize + gutter),
        };
    }), [cells, startDay, cellSize, gutter]);

    // Calculate total width/height
    const width = numWeeks * (cellSize + gutter) - gutter;
    const height = 7 * (cellSize + gutter) - gutter;

    const handleDayPress = useCallback((cell: any, event: any) => {
        if (onDayPress) {
            onDayPress(cell.date, cell.entries, {
                x: event.nativeEvent.pageX - (cellSize / 2),
                y: event.nativeEvent.pageY - (cellSize / 2)
            });
        }
    }, [onDayPress, cellSize]);

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Svg width={width} height={height}>
                {gridCells.map((cell, index) => (
                    <HeatmapCell
                        key={index}
                        x={cell.x}
                        y={cell.y}
                        cellSize={cellSize}
                        categories={cell.categories}
                        intensity={cell.intensity}
                        primaryColor={primaryColor}
                    />
                ))}
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
                        onPress={(e) => handleDayPress(cell, e)}
                        activeOpacity={0.7}
                    />
                ))}
            </View>
        </View>
    );
}