import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

const OPTIONS = [
  { label: '1分钟', detail: '60 秒后销毁' },
  { label: '5分钟', detail: '5 分钟后销毁' },
  { label: '30分钟', detail: '30 分钟后销毁' },
  { label: '1小时', detail: '1 小时后销毁' },
];

export default function BurnModal({ visible, current, onSelect, onCancel }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
        <View style={styles.modal}>
          <Text style={styles.title}>阅后即焚</Text>
          <Text style={styles.sub}>消息被阅读后，将在指定时间内自动销毁</Text>
          {OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.label} style={[styles.opt, current === opt.label && styles.optActive]} onPress={() => onSelect(opt.label)}>
              <View style={[styles.optMarker, current === opt.label && styles.optMarkerActive]}>
                {current === opt.label ? <View style={styles.optMarkerDot} /> : null}
              </View>
              <View style={styles.optBody}>
                <Text style={[styles.optText, current === opt.label && styles.optTextActive]}>{opt.label}</Text>
                <Text style={[styles.optDetail, current === opt.label && styles.optDetailActive]}>{opt.detail}</Text>
              </View>
              {current === opt.label ? <Text style={styles.check}>已选</Text> : null}
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

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modal: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingTop: 22, paddingBottom: 14, paddingHorizontal: 18, width: '100%', maxWidth: 340 },
  title: { color: '#111111', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 6 },
  sub: { color: '#7A7A7A', fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: 18 },
  opt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, marginBottom: 10, backgroundColor: '#F7F7F7', borderWidth: 1, borderColor: '#F1F1F1' },
  optActive: { backgroundColor: '#F1FAEC', borderColor: '#B7E0A5' },
  optMarker: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#C7C7C7', justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: '#FFFFFF' },
  optMarkerActive: { borderColor: '#63B245' },
  optMarkerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#63B245' },
  optBody: { flex: 1 },
  optText: { color: '#111111', fontSize: 16, fontWeight: '500' },
  optTextActive: { color: '#214A10' },
  optDetail: { color: '#8B8B8B', fontSize: 12, marginTop: 3 },
  optDetailActive: { color: '#5F8752' },
  check: { color: '#63B245', fontSize: 12, fontWeight: '600' },
  cancelBtn: { backgroundColor: '#F0F0F0', paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 2 },
  cancelText: { color: '#666666', fontSize: 16, fontWeight: '500' },
});
