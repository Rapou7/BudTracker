import React, { useEffect, useRef } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

interface StaggeredFadeInViewProps {
    children: React.ReactNode;
    style?: ViewStyle;
    delay?: number;
    duration?: number;
}

export function StaggeredFadeInView({
    children,
    style,
    delay = 0,
    duration = 300
}: StaggeredFadeInViewProps) {
    const isFocused = useIsFocused();
    const opacity = useSharedValue(0); // Start at 0 for new instances to allow animation
    const translateY = useSharedValue(0);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isFocused) {
            // Only animate on initial mount, otherwise just stay visible
            if (isInitialMount.current) {
                opacity.value = 0;
                translateY.value = 20;

                // Animate in with delay
                opacity.value = withDelay(delay, withTiming(1, { duration }));
                translateY.value = withDelay(delay, withTiming(0, { duration }));

                isInitialMount.current = false;
            } else {
                // When returning from a modal or other screen, immediately set to visible
                opacity.value = 1;
                translateY.value = 0;
            }
        }
        // Don't fade out or reset when losing focus - this prevents the modal background issue
    }, [isFocused, delay, duration, opacity, translateY]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
        };
    });

    return (
        <Animated.View style={[style, animatedStyle]}>
            {children}
        </Animated.View>
    );
}
