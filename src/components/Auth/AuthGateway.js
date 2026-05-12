import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginWithPhone, registerWithPhone } from '../../services/AuthService';
import { lookupPhone } from '../../services/ApiService';
import { setUserUnlockPin } from '../../services/UserService';

function normalizePhone(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

export default function AuthGateway({ onAuthed }) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [unlockPin, setUnlockPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const nextPhone = normalizePhone(phone);
    const nextUnlockPin = unlockPin.trim();

    if (!nextPhone) {
      Alert.alert('请输入手机号');
      return;
    }
    if (!nextUnlockPin) {
      Alert.alert('请设置计算器进入密码');
      return;
    }

    setLoading(true);
    try {
      const result = await lookupPhone(nextPhone);
      setPhone(nextPhone);

      let session;
      if (result.exists) {
        await setUserUnlockPin(nextUnlockPin);
        session = await loginWithPhone({ phone: nextPhone });
      } else {
        session = await registerWithPhone({ phone: nextPhone, unlockPin: nextUnlockPin });
      }

      onAuthed && onAuthed(session);
    } catch (error) {
      Alert.alert('进入失败', error.message || '无法进入账号');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>手机号绑定</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          第一次使用只需要填写手机号和计算器进入密码。手机号用于同步账号，密码只保存在这台设备，用来从计算器界面进入聊天。
        </Text>

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="输入手机号"
          placeholderTextColor="#9B9B9B"
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          value={unlockPin}
          onChangeText={setUnlockPin}
          placeholder="设置计算器进入密码"
          placeholderTextColor="#9B9B9B"
          keyboardType="number-pad"
          secureTextEntry
        />
        <TouchableOpacity style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? '进入中...' : '保存并进入'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDEDED' },
  header: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingBottom: 12 },
  title: { color: '#111111', fontSize: 20, fontWeight: '600' },
  content: { paddingHorizontal: 18, paddingTop: 12 },
  subtitle: { color: '#6B6B6B', fontSize: 14, lineHeight: 22, marginBottom: 18 },
  input: { minHeight: 50, borderRadius: 14, backgroundColor: '#FFFFFF', paddingHorizontal: 14, color: '#111111', fontSize: 16, marginBottom: 12 },
  primaryButton: { minHeight: 48, borderRadius: 24, backgroundColor: '#111111', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  primaryButtonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
