import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STICKERS } from './stickerCatalog';

export default function StickerPickerModal({ visible, onClose, onSelect }) {
  const renderSticker = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.82}
      style={styles.stickerItem}
      onPress={() => onSelect?.(item)}
      accessibilityLabel={`发送${item.label}`}
    >
      <Text style={styles.stickerEmoji}>{item.emoji}</Text>
      <Text style={[styles.stickerLabel, { color: item.accentColor }]} numberOfLines={1}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  if (!visible) {
    return null;
  }

  return (
    <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
        <View style={styles.header}>
          <Text style={styles.title}>表情包</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="关闭表情包面板">
            <Ionicons name="close" size={20} color="#666666" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={STICKERS}
          renderItem={renderSticker}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
    justifyContent: 'flex-end',
    zIndex: 1000,
    elevation: 1000,
  },
  sheet: {
    backgroundColor: '#F7F7F7',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 16,
    maxHeight: '72%',
    zIndex: 1001,
    elevation: 1001,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  grid: {
    paddingBottom: 4,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stickerItem: {
    width: '31.5%',
    minHeight: 74,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  stickerEmoji: {
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 3,
  },
  stickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});
