import React, { useState, useEffect } from 'react';
import { Alert, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { getUserId, generateInviteCode, getUserName } from '../../services/UserService';

export default function MyQRCode() {
  const [profile, setProfile] = useState({
    userId: '',
    inviteCode: '',
    name: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const [userId, inviteCode, name] = await Promise.all([
      getUserId(),
      generateInviteCode(),
      getUserName(),
    ]);
    setProfile({ userId, inviteCode, name });
  };

  const handleCopyUserId = async () => {
    const nextUserId = profile.userId?.trim();
    if (!nextUserId) {
      Alert.alert('复制失败', '用户ID还没生成完成');
      return;
    }
    await Clipboard.setStringAsync(nextUserId);
    Alert.alert('已复制', '用户ID 已复制，可以直接发给对方');
  };

  const generateQRMatrix = (code) => {
    const safeCode = code || 'QR::pending::0';
    const size = 21;
    const matrix = [];
    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j < size; j++) {
        if ((i < 7 && j < 7) || (i < 7 && j >= size - 7) || (i >= size - 7 && j < 7)) {
          row.push((i === 0 || i === 6 || j === 0 || j === 6) ? 1 : (i === j) ? 0 : 1);
        } else if (i >= size - 7 && j >= size - 7) {
          row.push((i === size - 7 || i === size - 1 || j === size - 7 || j === size - 1) ? 1 : (i === j) ? 0 : 1);
        } else {
          const charIndex = (i * size + j) % safeCode.length;
          const charCode = safeCode.charCodeAt(charIndex);
          row.push((charCode + i + j) % 2);
        }
      }
      matrix.push(row);
    }
    return matrix;
  };

  const qrMatrix = generateQRMatrix(profile.inviteCode);
  const avatarText = (profile.name || profile.userId || '我').slice(0, 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarText}</Text>
          </View>
          <View style={styles.userMeta}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.name || '正在生成身份'}</Text>
              <Ionicons name="shield-checkmark" size={16} color="#07C160" />
            </View>
          </View>
        </View>

        <View style={styles.qrBox}>
          <View style={styles.qrGrid}>
            {qrMatrix.map((row, i) => (
              <View key={i} style={styles.qrRow}>
                {row.map((cell, j) => (
                  <View key={j} style={[styles.qrCell, cell ? styles.qrCellDark : styles.qrCellLight]} />
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.codePill}>
          <Ionicons name="person-circle-outline" size={16} color="#07C160" />
          <Text style={styles.codeText}>{profile.userId || '生成中...'}</Text>
        </View>

        <TouchableOpacity style={styles.copyButton} onPress={handleCopyUserId} activeOpacity={0.85}>
          <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
          <Text style={styles.copyButtonText}>复制用户ID</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerCard}>
        <View style={styles.footerRow}>
          <Ionicons name="scan-outline" size={18} color="#07C160" />
          <Text style={styles.footerText}>对方扫码你的二维码，或输入你的用户ID 后，会先进入你的新朋友列表</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center', paddingTop: 4 },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#D8C3A1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#4E3E2D', fontSize: 24, fontWeight: '700' },
  userMeta: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  name: { color: '#111111', fontSize: 19, fontWeight: '600' },
  subline: { color: '#7D7D7D', fontSize: 13, marginBottom: 2 },
  qrBox: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 18,
  },
  qrGrid: { width: 180, height: 180 },
  qrRow: { flexDirection: 'row' },
  qrCell: { width: 8.5, height: 8.5 },
  qrCellDark: { backgroundColor: '#222222' },
  qrCellLight: { backgroundColor: '#FFFFFF' },
  codePill: {
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: '#F1FBF5',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  codeText: { color: '#07C160', fontSize: 12, fontFamily: 'monospace', flexShrink: 1 },
  copyButton: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#07C160',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  copyButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  footerCard: {
    width: '100%',
    marginTop: 14,
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  footerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  footerText: { flex: 1, color: '#666666', fontSize: 13, lineHeight: 18 },
});
