import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getUserUnlockPin } from '../../services/UserService';
import { updateUnlockPin } from '../../services/AuthService';

export default function UnlockPinSettings({ onBack, onLock }) {
  const insets = useSafeAreaInsets();
  const [unlockPin, setUnlockPin] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUserUnlockPin()
      .then((value) => setUnlockPin(String(value || '')))
      .catch((error) => Alert.alert('加载失败', error.message || '无法读取当前进入密码'));
  }, []);

  const handleSave = async () => {
    const nextPin = unlockPin.trim();
    if (!nextPin) {
      Alert.alert('保存失败', '密码不能为空');
      return;
    }

    setSaving(true);
    try {
      await updateUnlockPin(nextPin);
      onBack && onBack();
    } catch (error) {
      Alert.alert('保存失败', error.message || '无法修改进入密码');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack} accessibilityLabel="返回会话列表">
          <Ionicons name="chevron-back" size={24} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.title}>修改进入密码</Text>
        <TouchableOpacity style={styles.headerButton} onPress={onLock} accessibilityLabel="锁定应用">
          <Text style={styles.lockButtonText}>锁定</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>计算器进入密码</Text>
          <Text style={styles.cardHint}>这里只修改这台手机从计算器进入私密聊天的密码，不再修改手机号账号密码。</Text>
          <TextInput
            style={styles.input}
            value={unlockPin}
            onChangeText={setUnlockPin}
            placeholder="输入新的进入密码"
            placeholderTextColor="#9B9B9B"
            keyboardType="number-pad"
          />
          <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? '保存中...' : '确认修改'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDEDED' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 10, backgroundColor: '#F6F6F6', borderBottomWidth: 1, borderBottomColor: '#D8D8D8' },
  headerButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  title: { color: '#111111', fontSize: 18, fontWeight: '600' },
  lockButtonText: { color: '#111111', fontSize: 14, fontWeight: '500' },
  content: { paddingHorizontal: 12, paddingTop: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 18 },
  cardTitle: { color: '#111111', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  cardHint: { color: '#6B6B6B', fontSize: 14, lineHeight: 21, marginBottom: 14 },
  input: { minHeight: 48, borderRadius: 12, backgroundColor: '#F7F7F7', paddingHorizontal: 14, color: '#111111', fontSize: 16, marginBottom: 14 },
  saveButton: { minHeight: 46, borderRadius: 23, backgroundColor: '#111111', justifyContent: 'center', alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
