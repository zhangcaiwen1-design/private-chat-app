import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function QRScanner({ onScanned }) {
  const [val, setVal] = useState('');

  const handleScan = () => {
    const t = val.trim();
    if (t.startsWith('QR-')) {
      const id = t.substring(3);
      if (id.length > 0) { onScanned(id); setVal(''); return; }
    }
    Alert.alert('无效二维码', '请输入有效的二维码格式（QR-用户ID）');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>扫描二维码</Text>
      <Text style={styles.hint}>输入对方二维码下方显示的ID</Text>
      <TextInput style={styles.input} placeholder="输入 ID，如 QR-12345" placeholderTextColor="#BBBBBB" value={val} onChangeText={setVal} />
      <TouchableOpacity style={styles.btn} onPress={handleScan}>
        <Text style={styles.btnText}>确认添加</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 10, alignItems: 'center' },
  title: { color: '#333333', fontSize: 18, fontWeight: '600', marginBottom: 10 },
  hint: { color: '#888888', fontSize: 14, marginBottom: 22 },
  input: { width: '100%', backgroundColor: '#F7F7F7', color: '#333333', borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 20 },
  btn: { backgroundColor: '#07C160', paddingVertical: 15, paddingHorizontal: 55, borderRadius: 8 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});