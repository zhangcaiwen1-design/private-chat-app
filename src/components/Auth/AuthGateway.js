import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { loginWithPhone, registerWithPhone } from '../../services/AuthService';
import { lookupPhone } from '../../services/ApiService';

function normalizePhone(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

export default function AuthGateway({ onAuthed }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => {
    if (step === 'phone') return '手机号登录 / 注册';
    if (step === 'login') return '输入密码';
    return '创建账号';
  }, [step]);

  const subtitle = useMemo(() => {
    if (step === 'phone') return '第一次在这台手机进入时，需要先绑定手机号账号。';
    if (step === 'login') return '输入你设置过的密码，后面同一台设备无需重复登录。';
    return '昵称必填，头像后面再补也可以。';
  }, [step]);

  const handleNextFromPhone = async () => {
    const nextPhone = normalizePhone(phone);
    if (!nextPhone) {
      Alert.alert('请输入手机号');
      return;
    }

    setLoading(true);
    try {
      const result = await lookupPhone(nextPhone);
      setPhone(nextPhone);
      setStep(result.exists ? 'login' : 'register');
    } catch (error) {
      Alert.alert('继续失败', error.message || '无法检查手机号');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!password.trim()) {
      Alert.alert('请输入密码');
      return;
    }

    setLoading(true);
    try {
      await loginWithPhone({ phone: normalizePhone(phone), password: password.trim() });
      onAuthed && onAuthed();
    } catch (error) {
      Alert.alert('登录失败', error.message || '手机号或密码错误');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!password.trim() || !nickname.trim()) {
      Alert.alert('请填写完整信息', '昵称和密码都不能为空');
      return;
    }

    setLoading(true);
    try {
      await registerWithPhone({
        phone: normalizePhone(phone),
        password: password.trim(),
        nickname: nickname.trim(),
      });
      onAuthed && onAuthed();
    } catch (error) {
      Alert.alert('注册失败', error.message || '无法创建账号');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        {step !== 'phone' ? (
          <TouchableOpacity style={styles.headerButton} onPress={() => setStep('phone')}>
            <Ionicons name="chevron-back" size={24} color="#111111" />
          </TouchableOpacity>
        ) : <View style={styles.headerButton} />}
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {step === 'phone' ? (
          <>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="输入手机号"
              placeholderTextColor="#9B9B9B"
              keyboardType="phone-pad"
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleNextFromPhone} disabled={loading}>
              <Text style={styles.primaryButtonText}>{loading ? '检查中...' : '继续'}</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {step === 'login' ? (
          <>
            <Text style={styles.readonlyText}>手机号：{phone}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="输入密码"
              placeholderTextColor="#9B9B9B"
              secureTextEntry
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
              <Text style={styles.primaryButtonText}>{loading ? '登录中...' : '登录'}</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>忘记密码请联系开发者找回。</Text>
          </>
        ) : null}

        {step === 'register' ? (
          <>
            <Text style={styles.readonlyText}>手机号：{phone}</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="输入昵称"
              placeholderTextColor="#9B9B9B"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="设置密码"
              placeholderTextColor="#9B9B9B"
              secureTextEntry
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
              <Text style={styles.primaryButtonText}>{loading ? '注册中...' : '注册并继续'}</Text>
            </TouchableOpacity>
          </>
        ) : null}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDEDED' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 12 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#111111', fontSize: 20, fontWeight: '600' },
  content: { paddingHorizontal: 18, paddingTop: 12 },
  subtitle: { color: '#6B6B6B', fontSize: 14, lineHeight: 22, marginBottom: 18 },
  readonlyText: { color: '#111111', fontSize: 14, marginBottom: 12 },
  input: { minHeight: 50, borderRadius: 14, backgroundColor: '#FFFFFF', paddingHorizontal: 14, color: '#111111', fontSize: 16, marginBottom: 12 },
  primaryButton: { minHeight: 48, borderRadius: 24, backgroundColor: '#111111', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  helperText: { color: '#8A8A8A', fontSize: 13, marginTop: 12 },
});
