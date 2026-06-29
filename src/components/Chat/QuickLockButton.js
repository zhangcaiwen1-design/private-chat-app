import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function QuickLockButton({ onPress, bottom = 96 }) {
  return (
    <TouchableOpacity
      style={[styles.button, { bottom }]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityLabel="快速返回计算器"
    >
      <Ionicons name="calculator-outline" size={20} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(17,17,17,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
