import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  isActiveMembership,
  MONTHLY_MEMBERSHIP_PLAN,
  refreshMembershipStatus,
  requestMonthlyMembership,
} from '../../services/MembershipService';

const DEVELOPER_WECHAT = 'Nanny_1688';

const BENEFITS = [
  { icon: 'chatbubbles-outline', title: '私密聊天', subtitle: '开通后进入聊天界面' },
  { icon: 'happy-outline', title: '表情包', subtitle: '可发送内置小表情包' },
  { icon: 'cloud-done-outline', title: '云备份恢复', subtitle: '聊天记录可上传和恢复' },
  { icon: 'phone-portrait-outline', title: '账号同步', subtitle: '手机号账号跨设备同步' },
  { icon: 'lock-closed-outline', title: '计算器锁屏', subtitle: '保留伪装入口和本机密码' },
];

function formatExpireTime(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString();
}

function getStatusCopy(snapshot) {
  if (isActiveMembership(snapshot)) {
    return {
      title: '已开通',
      hint: `有效期至 ${formatExpireTime(snapshot.expire_at)}`,
      icon: 'checkmark-circle',
      color: '#07C160',
    };
  }

  if (snapshot.status === 'pending_review') {
    return {
      title: '待开通',
      hint: '后台确认后会自动变为已开通',
      icon: 'time-outline',
      color: '#F59E0B',
    };
  }

  if (snapshot.status === 'expired') {
    return {
      title: '已到期',
      hint: '续费后恢复聊天和云端能力',
      icon: 'alert-circle-outline',
      color: '#FA5151',
    };
  }

  return {
    title: '未开通',
    hint: '开通会员后才能进入聊天界面',
    icon: 'lock-closed-outline',
    color: '#111111',
  };
}

export default function MembershipCenter({ onBack, onLock, onMembershipActive, onSwitchAccount, isRequired = false }) {
  const insets = useSafeAreaInsets();
  const [snapshot, setSnapshot] = useState({ tier: 'free', status: 'inactive', expire_at: null, pending_order: null });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const active = isActiveMembership(snapshot);
  const pending = snapshot.status === 'pending_review';
  const statusCopy = getStatusCopy(snapshot);

  const load = useCallback(async ({ showError = true } = {}) => {
    setLoading(true);
    try {
      const membership = await refreshMembershipStatus();
      setSnapshot(membership);
      return membership;
    } catch (error) {
      if (showError) {
        Alert.alert('加载失败', error.message || '无法获取会员状态');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isRequired && active) {
      onMembershipActive && onMembershipActive();
    }
  }, [active, isRequired, onMembershipActive]);

  const handlePrimaryAction = async () => {
    if (active) {
      onMembershipActive && onMembershipActive();
      return;
    }

    if (pending) {
      const membership = await load();
      if (isActiveMembership(membership)) {
        onMembershipActive && onMembershipActive();
      }
      return;
    }

    setSubmitting(true);
    try {
      const order = await requestMonthlyMembership();
      setSnapshot((current) => ({
        ...current,
        tier: 'free',
        status: 'pending_review',
        plan_code: order.plan_code,
        pending_order: order,
      }));
      Alert.alert('已提交开通申请', '后台开通后，点击刷新即可进入聊天。');
    } catch (error) {
      const message = error.message || '无法提交会员申请';
      if (message.includes('待审核')) {
        await load({ showError: false });
        Alert.alert('正在处理中', '你已有待开通申请，审核后会自动生效。');
      } else {
        Alert.alert('提交失败', message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const primaryLabel = active
    ? '进入聊天'
    : pending
      ? '刷新开通状态'
      : `立即开通 ¥${MONTHLY_MEMBERSHIP_PLAN.amount}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {isRequired && !active ? (
          <View style={styles.headerButton} />
        ) : (
          <TouchableOpacity style={styles.headerButton} onPress={onBack} accessibilityLabel="返回会话列表">
            <Ionicons name="chevron-back" size={24} color="#111111" />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{isRequired && !active ? '开通会员' : '会员中心'}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={onLock} accessibilityLabel="锁定应用">
          <Text style={styles.lockButtonText}>锁定</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.planPanel}>
          <Text style={styles.planLabel}>私密聊天会员</Text>
          <View style={styles.priceRow}>
            <Text style={styles.currency}>¥</Text>
            <Text style={styles.price}>{MONTHLY_MEMBERSHIP_PLAN.amount}</Text>
            <Text style={styles.cycle}>/ 30天</Text>
          </View>
          <Text style={styles.planHint}>开通后进入聊天，聊天、表情包、云备份和设备同步都包含。</Text>
          <TouchableOpacity
            style={[styles.primaryButton, (loading || submitting) && styles.primaryButtonDisabled]}
            onPress={handlePrimaryAction}
            disabled={loading || submitting}
            activeOpacity={0.86}
          >
            {loading || submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            )}
          </TouchableOpacity>
          {isRequired && !active ? <Text style={styles.requiredHint}>未开通会员时只能停留在登录和订阅页</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>当前状态</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusIcon, { backgroundColor: `${statusCopy.color}18` }]}>
              <Ionicons name={statusCopy.icon} size={23} color={statusCopy.color} />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={styles.statusValue}>{statusCopy.title}</Text>
              <Text style={styles.statusHint}>{statusCopy.hint}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>会员权益</Text>
          {BENEFITS.map((item) => (
            <View style={styles.benefitRow} key={item.title}>
              <View style={styles.benefitIcon}>
                <Ionicons name={item.icon} size={19} color="#07C160" />
              </View>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>{item.title}</Text>
                <Text style={styles.benefitSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>开通方式</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>微信小程序虚拟支付</Text>
            <Text style={styles.paymentStatus}>预留接入</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>当前网页演示</Text>
            <Text style={styles.paymentStatus}>{pending ? '待后台开通' : '提交开通申请'}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>人工兜底微信</Text>
            <Text selectable style={styles.paymentStatus}>{DEVELOPER_WECHAT}</Text>
          </View>
        </View>

        {isRequired && !active ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={onSwitchAccount} activeOpacity={0.82}>
            <Ionicons name="swap-horizontal-outline" size={18} color="#111111" />
            <Text style={styles.secondaryButtonText}>切换手机号</Text>
          </TouchableOpacity>
        ) : null}
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
  content: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 28 },
  planPanel: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 18, marginBottom: 12 },
  planLabel: { color: '#111111', fontSize: 17, fontWeight: '600', marginBottom: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  currency: { color: '#111111', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  price: { color: '#111111', fontSize: 44, fontWeight: '800', lineHeight: 50 },
  cycle: { color: '#6B6B6B', fontSize: 15, marginLeft: 6, marginBottom: 8 },
  planHint: { color: '#4F4F4F', fontSize: 14, lineHeight: 21, marginBottom: 16 },
  primaryButton: { minHeight: 48, borderRadius: 24, backgroundColor: '#07C160', justifyContent: 'center', alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.66 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  requiredHint: { color: '#8A8A8A', fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: 'center' },
  section: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 12 },
  sectionTitle: { color: '#111111', fontSize: 17, fontWeight: '600', marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statusTextWrap: { flex: 1 },
  statusValue: { color: '#111111', fontSize: 19, fontWeight: '700', marginBottom: 4 },
  statusHint: { color: '#6B6B6B', fontSize: 13, lineHeight: 19 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  benefitIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1FBF5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  benefitTextWrap: { flex: 1 },
  benefitTitle: { color: '#111111', fontSize: 15, fontWeight: '600', marginBottom: 3 },
  benefitSubtitle: { color: '#7A7A7A', fontSize: 13 },
  paymentRow: { minHeight: 38, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F1F1' },
  paymentLabel: { color: '#4F4F4F', fontSize: 14 },
  paymentStatus: { color: '#111111', fontSize: 14, fontWeight: '600', marginLeft: 12 },
  secondaryButton: { minHeight: 46, borderRadius: 23, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  secondaryButtonText: { color: '#111111', fontSize: 14, fontWeight: '600' },
});
