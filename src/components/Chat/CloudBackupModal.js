import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

export default function CloudBackupModal({ visible, onUpload, onCancel }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconWrap}><Text style={styles.icon}>☁️</Text></View>
          <Text style={styles.title}>上云备份</Text>
          <Text style={styles.hint}>内容将加密存储到云端，可随时调用查看</Text>
          <View style={styles.btns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}><Text style={styles.cancelText}>取消</Text></TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onUpload}><Text style={styles.confirmText}>确认</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 28, width: '80%', alignItems: 'center' },
  iconWrap: { marginBottom: 16 },
  icon: { fontSize: 48 },
  title: { color: '#333333', fontSize: 18, fontWeight: '600', marginBottom: 10 },
  hint: { color: '#888888', fontSize: 14, textAlign: 'center', marginBottom: 26, lineHeight: 20 },
  btns: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmBtn: { flex: 1, backgroundColor: '#07C160', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  confirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  cancelBtn: { flex: 1, backgroundColor: '#F0F0F0', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  cancelText: { color: '#333333', fontSize: 16, fontWeight: '600' },
});