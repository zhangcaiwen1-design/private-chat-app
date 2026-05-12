import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { refreshMembershipStatus } from '../../services/MembershipService';

const DEVELOPER_WECHAT = 'Nanny_1688';

export default function MembershipCenter({ onBack, onLock }) {
  const insets = useSafeAreaInsets();
  const [snapshot, setSnapshot] = useState({ tier: 'free', status: 'inactive', expire_at: null, pending_order: null });

  const load = useCallback(async () => {
    const membership = await refreshMembershipStatus();
    setSnapshot(membership);
  }, []);

  useEffect(() => {
    load().catch((error) => Alert.alert('加载失败', error.message || '无法获取会员状态'));
  }, [load]);

  const statusText = snapshot.status === 'active'
    ? '已开通'
    : snapshot.status === 'pending_review'
      ? '待开通'
      : snapshot.status === 'expired'
        ? '已到期'
        : '未开通';

  const statusHint = snapshot.status === 'active'
    ? `会员有效期至 ${new Date(snapshot.expire_at).toLocaleString()}`
    : snapshot.status === 'pending_review'
      ? '请联系开发者确认开通方式，我们会尽快处理。'
      : '联系开发者微信后，可通过开通码或确认后的方式为你开通。';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack} accessibilityLabel="返回会话列表">
          <Ionicons name="chevron-back" size={24} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.title}>会员中心</Text>
        <TouchableOpacity style={styles.headerButton} onPress={onLock} accessibilityLabel="锁定应用">
          <Text style={styles.lockButtonText}>锁定</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>9.9元/月</Text>
          <Text style={styles.heroSubtitle}>开通会员，解锁云上传与云下载恢复</Text>
          <Text style={styles.heroMeta}>无需上传截图，也不需要看收款码说明。</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>当前权益</Text>
          <Text style={styles.benefitItem}>• 云上传</Text>
          <Text style={styles.benefitItem}>• 云下载恢复</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>当前状态</Text>
          <Text style={styles.statusValue}>{statusText}</Text>
          <Text style={styles.statusHint}>{statusHint}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>开通方式</Text>
          <Text style={styles.contactLabel}>联系开发者微信</Text>
          <Text selectable style={styles.wechatValue}>{DEVELOPER_WECHAT}</Text>
          <Text style={styles.contactHint}>添加后说明你要开通会员，我会给你开通码或认可的开通方式。</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDEDED' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 10, backgroundColor: '#F6F6F6', borderBottomWidth: 1, borderBottomColor: '#D8D8D8' },
  headerButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  title: { color: '#111111', fontSize: 18, fontWeight: '600' },
  lockButtonText: { color: '#111111', fontSize: 14, fontWeight: '500' },
  content: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24 },
  heroCard: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 18, marginBottom: 12 },
  heroTitle: { color: '#111111', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  heroSubtitle: { color: '#4F4F4F', fontSize: 15, lineHeight: 22, marginBottom: 10 },
  heroMeta: { color: '#8A8A8A', fontSize: 13, lineHeight: 20 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 12 },
  sectionTitle: { color: '#111111', fontSize: 17, fontWeight: '600', marginBottom: 12 },
  benefitItem: { color: '#333333', fontSize: 15, lineHeight: 24 },
  statusValue: { color: '#111111', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  statusHint: { color: '#6B6B6B', fontSize: 14, lineHeight: 21 },
  contactLabel: { color: '#8A8A8A', fontSize: 13, marginBottom: 8 },
  wechatValue: { color: '#07C160', fontSize: 28, fontWeight: '700', marginBottom: 10 },
  contactHint: { color: '#4F4F4F', fontSize: 14, lineHeight: 22 },
});
