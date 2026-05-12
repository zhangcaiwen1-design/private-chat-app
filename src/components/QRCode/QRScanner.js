import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

export default function QRScanner({ onScanned }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const permissionState = useMemo(() => {
    if (!permission) {
      return 'loading';
    }
    return permission.granted ? 'granted' : 'denied';
  }, [permission]);

  const handleScan = ({ data }) => {
    const value = String(data || '').trim();
    if (!value) {
      return;
    }
    if (!((value.startsWith('QR-') && value.length > 3) || (value.startsWith('QR::') && value.length > 5))) {
      setScanned(true);
      Alert.alert('无效二维码', '请扫描应用内生成的好友二维码');
      return;
    }
    setScanned(true);
    onScanned(value);
  };

  if (permissionState === 'loading') {
    return (
      <View style={styles.wrap}>
        <View style={styles.heroIcon}>
          <Ionicons name="scan-outline" size={28} color="#07C160" />
        </View>
        <Text style={styles.title}>扫一扫添加好友</Text>
        <Text style={styles.hint}>正在检查摄像头权限...</Text>
      </View>
    );
  }

  if (permissionState === 'denied') {
    return (
      <View style={styles.wrap}>
        <View style={styles.heroIcon}>
          <Ionicons name="camera-outline" size={28} color="#07C160" />
        </View>
        <Text style={styles.title}>打开摄像头后才能扫码</Text>
        <Text style={styles.hint}>允许访问摄像头后，就可以直接扫描对方二维码发送好友申请。</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission} activeOpacity={0.85}>
          <Ionicons name="key-outline" size={18} color="#FFFFFF" />
          <Text style={styles.btnText}>允许摄像头</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.heroIcon}>
        <Ionicons name="scan-outline" size={28} color="#07C160" />
      </View>
      <Text style={styles.title}>扫一扫添加好友</Text>
      <Text style={styles.hint}>将对方二维码放进取景框内，识别后会直接发送好友申请。</Text>

      <View style={styles.cameraShell}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleScan}
        />
        <View pointerEvents="none" style={styles.scanFrame}>
          <View style={styles.scanCornerTopLeft} />
          <View style={styles.scanCornerTopRight} />
          <View style={styles.scanCornerBottomLeft} />
          <View style={styles.scanCornerBottomRight} />
        </View>
      </View>

      <View style={styles.tipCard}>
        <View style={styles.tipRow}>
          <Ionicons name="checkmark-circle" size={18} color="#07C160" />
          <Text style={styles.tipText}>扫码成功后，对方会在“新朋友”里看到你的申请</Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="refresh-circle-outline" size={18} color="#07C160" />
          <Text style={styles.tipText}>如果刚才扫错了，可以重新开启识别</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.btn, scanned && styles.btnSecondary]} onPress={() => setScanned(false)} activeOpacity={0.85}>
        <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
        <Text style={styles.btnText}>{scanned ? '重新扫码' : '开始识别'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center', paddingTop: 8 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EAF9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: { color: '#111111', fontSize: 20, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  hint: { color: '#7D7D7D', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  cameraShell: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#101010',
    marginBottom: 16,
    position: 'relative',
  },
  camera: { flex: 1 },
  scanFrame: {
    position: 'absolute',
    top: '18%',
    left: '18%',
    right: '18%',
    bottom: '18%',
  },
  scanCornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 34,
    height: 34,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: 10,
  },
  scanCornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 34,
    height: 34,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
    borderTopRightRadius: 10,
  },
  scanCornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 34,
    height: 34,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
    borderBottomLeftRadius: 10,
  },
  scanCornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
    borderBottomRightRadius: 10,
  },
  tipCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 20,
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8 },
  tipText: { flex: 1, color: '#666666', fontSize: 13, lineHeight: 18 },
  btn: {
    minHeight: 48,
    backgroundColor: '#07C160',
    paddingHorizontal: 24,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  btnSecondary: { backgroundColor: '#16A34A' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});