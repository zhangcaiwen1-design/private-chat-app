import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getUserId, generateInviteCode } from '../../services/UserService';

export default function MyQRCode() {
  const [userId, setUserId] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const id = await getUserId();
    const code = await generateInviteCode();
    setUserId(id);
    setInviteCode(code);
  };

  // 生成模拟二维码（小方块矩阵）
  const generateQRMatrix = (code) => {
    const size = 21;
    const matrix = [];
    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j < size; j++) {
        // 角落定位图案
        if ((i < 7 && j < 7) || (i < 7 && j >= size - 7) || (i >= size - 7 && j < 7)) {
          row.push((i === 0 || i === 6 || j === 0 || j === 6) ? 1 : (i === j) ? 0 : 1);
        }
        // 另一个角落
        else if (i >= size - 7 && j >= size - 7) {
          row.push((i === size - 7 || i === size - 1 || j === size - 7 || j === size - 1) ? 1 : (i === j) ? 0 : 1);
        }
        // 基于内容的伪随机
        else {
          const charIndex = (i * size + j) % code.length;
          const charCode = code.charCodeAt(charIndex);
          row.push((charCode + i + j) % 2);
        }
      }
      matrix.push(row);
    }
    return matrix;
  };

  const qrMatrix = generateQRMatrix(inviteCode);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>我的二维码</Text>
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
      <Text style={styles.hint}>让对方扫描此二维码添加你</Text>
      <Text style={styles.codeText}>{inviteCode}</Text>
      <Text style={styles.idText}>用户ID: {userId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8 },
  title: { color: '#333333', fontSize: 18, fontWeight: '600', marginBottom: 20 },
  qrBox: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 16 },
  qrGrid: { width: 180, height: 180 },
  qrRow: { flexDirection: 'row' },
  qrCell: { width: 8.5, height: 8.5 },
  qrCellDark: { backgroundColor: '#333333' },
  qrCellLight: { backgroundColor: '#FFFFFF' },
  hint: { color: '#888888', fontSize: 14, textAlign: 'center', marginBottom: 10 },
  codeText: { color: '#07C160', fontSize: 12, fontFamily: 'monospace', marginBottom: 6 },
  idText: { color: '#BFBFBF', fontSize: 11 },
});