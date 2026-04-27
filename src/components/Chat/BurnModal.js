import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

const OPTIONS = [
  { label: '1分钟', icon: '⚡' },
  { label: '5分钟', icon: '⏱' },
  { label: '30分钟', icon: '⏰' },
  { label: '1小时', icon: '🔥' },
];

export default function BurnModal({ visible, current, onSelect, onCancel }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
        <View style={styles.modal}>
          <Text style={styles.title}>🔥 阅后即焚</Text>
          <Text style={styles.sub}>消息被阅读后将在指定时间自动销毁</Text>
          {OPTIONS.map(opt => (
            <TouchableOpacity key={opt.label} style={[styles.opt, current === opt.label && styles.optActive]} onPress={() => onSelect(opt.label)}>
              <Text style={styles.optIcon}>{opt.icon}</Text>
              <Text style={[styles.optText, current === opt.label && styles.optTextActive]}>{opt.label}</Text>
              {current === opt.label && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = {
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#FFF', borderRadius: 14, padding: 24, width: '82%' },
  title: { color: '#333', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  sub: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  opt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, marginBottom: 8, backgroundColor: '#F7F7F7' },
  optActive: { backgroundColor: 'rgba(255,107,53,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,53,0.3)' },
  optIcon: { fontSize: 18, marginRight: 12 },
  optText: { color: '#333', fontSize: 16, flex: 1 },
  optTextActive: { color: '#ff6b35' },
  check: { color: '#ff6b35', fontSize: 16, fontWeight: '700' },
  cancelBtn: { backgroundColor: '#F0F0F0', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  cancelText: { color: '#888', fontSize: 16 },
};