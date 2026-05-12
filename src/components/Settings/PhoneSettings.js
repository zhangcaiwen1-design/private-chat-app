import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getUserPhone, setUserProfile } from '../../services/UserService';
import { updateUser } from '../../services/ApiService';

export default function PhoneSettings({ onBack, onLock }) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState('muted');

  useEffect(() => {
    getUserPhone()
      .then((value) => setPhone(String(value || '')))
      .catch((error) => Alert.alert('加载失败', error.message || '无法读取当前手机号'));
  }, []);

  const handleSave = async () => {
    const nextPhone = phone.trim();
    if (!nextPhone) {
      setStatusTone('error');
      setStatusMessage('手机号不能为空');
      Alert.alert('保存失败', '手机号不能为空');
      return;
    }

    setSaving(true);
    setStatusTone('muted');
    setStatusMessage('提交中...');
    try {
      const result = await updateUser({ phone: nextPhone });
      await setUserProfile({ phone: result.user.phone });
      setStatusTone('success');
      setStatusMessage(`已修改为 ${result.user.phone}`);
      Alert.alert('修改成功', '手机号已更新', [
        { text: '知道了', onPress: () => onBack && onBack() },
      ]);
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(error.message || '无法修改手机号');
      Alert.alert('保存失败', error.message || '无法修改手机号');
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
        <Text style={styles.title}>修改手机号</Text>
        <TouchableOpacity style={styles.headerButton} onPress={onLock} accessibilityLabel="锁定应用">
          <Text style={styles.lockButtonText}>锁定</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>登录手机号</Text>
          <Text style={styles.cardHint}>这里修改的是账号手机号，改完后以后登录、找回和邀请都会用新号码。</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              if (statusMessage) {
                setStatusMessage('');
              }
            }}
            placeholder="输入新的手机号"
            placeholderTextColor="#9B9B9B"
            keyboardType="phone-pad"
          />
          {statusMessage ? <Text style={[styles.statusText, statusTone === 'error' ? styles.statusTextError : statusTone === 'success' ? styles.statusTextSuccess : styles.statusTextMuted]}>{statusMessage}</Text> : null}
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
  input: { minHeight: 48, borderRadius: 12, backgroundColor: '#F7F7F7', paddingHorizontal: 14, color: '#111111', fontSize: 16, marginBottom: 10 },
  statusText: { fontSize: 13, marginBottom: 12 },
  statusTextMuted: { color: '#6B6B6B' },
  statusTextSuccess: { color: '#07C160' },
  statusTextError: { color: '#D92D20' },
  saveButton: { minHeight: 46, borderRadius: 23, backgroundColor: '#111111', justifyContent: 'center', alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
