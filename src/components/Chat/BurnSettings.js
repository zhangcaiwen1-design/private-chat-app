import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

const OPTIONS = [
  { label: '1分钟', icon: '⚡' },
  { label: '5分钟', icon: '⏱' },
  { label: '30分钟', icon: '⏰' },
  { label: '1小时', icon: '🔥' },
];

export default function BurnSettings({ visible, onSelect, onCancel, currentOption }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
        <View style={styles.modal}>
          <Text style={styles.title}>🔥 阅后即焚</Text>
          <Text style={styles.subtitle}>消息被阅读后将在指定时间自动销毁</Text>
          <View style={styles.options}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.label} style={[styles.option, currentOption === opt.label && styles.optionSelected]} onPress={() => onSelect(opt.label)}>
                <Text style={styles.optionIcon}>{opt.icon}</Text>
                <Text style={[styles.optionText, currentOption === opt.label && styles.optionTextSelected]}>{opt.label}</Text>
                {currentOption === opt.label && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#161b22', borderRadius: 20, padding: 26, width: '84%', borderWidth: 1, borderColor: '#30363d' },
  title: { color: '#e6edf3', fontSize: 21, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: '#6e7681', fontSize: 13, textAlign: 'center', marginBottom: 22 },
  options: { marginBottom: 18 },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#21262d', paddingVertical: 15, paddingHorizontal: 18, borderRadius: 12, marginBottom: 10 },
  optionIcon: { fontSize: 18, marginRight: 12 },
  optionText: { color: '#e6edf3', fontSize: 16, flex: 1 },
  optionSelected: { backgroundColor: 'rgba(255, 120, 50, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 120, 50, 0.4)' },
  optionTextSelected: { color: '#ff7849' },
  checkmark: { color: '#ff7849', fontSize: 16, fontWeight: '700' },
  cancelBtn: { backgroundColor: '#21262d', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#6e7681', fontSize: 16 },
});