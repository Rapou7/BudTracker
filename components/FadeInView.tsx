import React, { useEffect, useRef } from 'react';
import { ViewStyle, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { Colors } from '../constants/Colors';

interface FadeInViewProps {
    children: React.ReactNode;
    style?: ViewStyle;
    duration?: number;
}

export function FadeInView({ children, style, duration = 300 }: FadeInViewProps) {
    const isFocused = useIsFocused();
    const opacity = useSharedValue(1); // Start at 1 to prevent initial flash
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isFocused) {
            // Only animate on initial mount, otherwise just stay visible
            if (isInitialMount.current) {
                opacity.value = 0;
                opacity.value = withTiming(1, { duration });
                isInitialMount.current = false;
            } else {
                // When returning from a modal, immediately set to visible
                opacity.value = 1;
            }
        }
        // Don't fade out when losing focus - this prevents the modal background issue
    }, [isFocused, duration, opacity]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    return (
        <View style={[{ flex: 1, backgroundColor: Colors.dark.background }, style]}>
            <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                {children}
            </Animated.View>
        </View>
    );
}
