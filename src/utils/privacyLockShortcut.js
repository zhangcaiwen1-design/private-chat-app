import { useMemo, useRef } from 'react';
import { PanResponder } from 'react-native';

const SWIPE_THRESHOLD = 72;
const DOUBLE_TAP_INTERVAL = 320;

export function usePrivacyLockShortcut({ onHorizontalSwipe, onDoubleTap } = {}) {
  const lastTapAtRef = useRef(0);

  const handleHeaderPress = () => {
    const now = Date.now();
    if (now - lastTapAtRef.current <= DOUBLE_TAP_INTERVAL) {
      lastTapAtRef.current = 0;
      onDoubleTap && onDoubleTap();
      return;
    }
    lastTapAtRef.current = now;
  };

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const horizontalDistance = Math.abs(gestureState.dx);
      const verticalDistance = Math.abs(gestureState.dy);
      return horizontalDistance > 14 && horizontalDistance > verticalDistance * 1.5;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (Math.abs(gestureState.dx) >= SWIPE_THRESHOLD) {
        onHorizontalSwipe && onHorizontalSwipe();
      }
    },
  }), [onHorizontalSwipe]);

  return {
    handleHeaderPress,
    panHandlers: panResponder.panHandlers,
  };
}
