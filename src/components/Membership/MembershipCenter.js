import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  FALLBACK_MEMBERSHIP_PLANS,
  isActiveMembership,
  refreshMembershipPlans,
  refreshMembershipStatus,
} from '../../services/MembershipService';

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

  if (snapshot.status === 'pending_payment') {
    return {
      title: '待支付',
      hint: '请到微信小程序完成购买后刷新状态',
      icon: 'card-outline',
      color: '#3B82F6',
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

function getPlanTotalDays(plan) {
  return Number(plan?.totalDays || 0) || Number(plan?.days || 30) + Number(plan?.bonusDays || 0);
}

function formatPlanCaption(plan) {
  if (!plan) {
    return '';
  }
  if (plan.code === 'quarterly_99') {
    return '平均约33元/月';
  }
  if (plan.code === 'annual_299') {
    return '平均约24.9元/月';
  }
  if (plan.bonusDays) {
    return `${plan.days}天 + 赠${plan.bonusDays}天`;
  }
  return `${plan.days}天有效`;
}

export default function MembershipCenter({ onBack, onLock, onMembershipActive, onSwitchAccount, isRequired = false }) {
  const insets = useSafeAreaInsets();
  const [snapshot, setSnapshot] = useState({ tier: 'free', status: 'inactive', expire_at: null, pending_order: null });
  const [plans, setPlans] = useState(FALLBACK_MEMBERSHIP_PLANS);
  const [selectedPlanCode, setSelectedPlanCode] = useState('first_month_19_9');
  const [loading, setLoading] = useState(true);

  const active = isActiveMembership(snapshot);
  const statusCopy = getStatusCopy(snapshot);
  const selectedPlan = plans.find((item) => item.code === selectedPlanCode) || plans[0] || FALLBACK_MEMBERSHIP_PLANS[0];

  const load = useCallback(async ({ showError = true } = {}) => {
    setLoading(true);
    try {
      const [membership, loadedPlans] = await Promise.all([
        refreshMembershipStatus(),
        refreshMembershipPlans(),
      ]);
      setSnapshot(membership);
      const nextPlans = loadedPlans?.length ? loadedPlans : membership.available_plans || FALLBACK_MEMBERSHIP_PLANS;
      setPlans(nextPlans);
      if (!nextPlans.some((item) => item.code === selectedPlanCode)) {
        setSelectedPlanCode(nextPlans[0]?.code || 'first_month_19_9');
      }
      return membership;
    } catch (error) {
      if (showError) {
        Alert.alert('加载失败', error.message || '无法获取会员状态');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedPlanCode]);

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

    if (snapshot.status === 'pending_payment') {
      const membership = await load({ showError: false });
      if (isActiveMembership(membership)) {
        onMembershipActive && onMembershipActive();
        return;
      }
      Alert.alert('待支付', '请在微信小程序中完成支付后，再回到此页面刷新状态。');
      return;
    }

    Alert.alert(
      '请在微信小程序购买',
      `当前选择：${selectedPlan.name} ¥${selectedPlan.amount}。支付成功后系统会自动开通会员，回到这里点刷新即可同步状态。`,
    );
  };

  const primaryLabel = active
    ? '进入聊天'
    : snapshot.status === 'pending_payment'
      ? '查看支付状态'
      : `去小程序购买 ¥${selectedPlan.amount}`;

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
          <Text style={styles.planLabel}>选择会员套餐</Text>
          <View style={styles.planGrid}>
            {plans.map((plan) => {
              const selected = plan.code === selectedPlan.code;
              return (
                <TouchableOpacity
                  key={plan.code}
                  activeOpacity={0.86}
                  style={[styles.planCard, selected && styles.planCardSelected, plan.featured && styles.planCardFeatured]}
                  onPress={() => setSelectedPlanCode(plan.code)}
                >
                  <View style={styles.planCardHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {plan.badge ? <Text style={styles.planBadge}>{plan.badge}</Text> : null}
                  </View>
                  <View style={styles.planPriceRow}>
                    <Text style={styles.planCurrency}>¥</Text>
                    <Text style={styles.planPrice}>{plan.amount}</Text>
                    <Text style={styles.planCycle}>/{plan.days}天</Text>
                  </View>
                  <Text style={styles.planCaption}>{formatPlanCaption(plan)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.planHint}>开通后聊天、表情包、图片语音、云备份和账号同步都包含。</Text>
          <Text style={styles.planHintSmall}>当前选择：{selectedPlan.name}，预计开通 {getPlanTotalDays(selectedPlan)} 天。</Text>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handlePrimaryAction}
            disabled={loading}
            activeOpacity={0.86}
          >
            {loading ? (
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
          <Text style={styles.sectionTitle}>赠送会员</Text>
          <View style={styles.giftRow}>
            <Text style={styles.giftTitle}>新用户体验</Text>
            <Text style={styles.giftValue}>3天</Text>
          </View>
          <View style={styles.giftRow}>
            <Text style={styles.giftTitle}>首购加赠</Text>
            <Text style={styles.giftValue}>7天</Text>
          </View>
          <View style={styles.giftRow}>
            <Text style={styles.giftTitle}>邀请好友</Text>
            <Text style={styles.giftValue}>双方各3天</Text>
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
            <Text style={styles.paymentLabel}>微信小程序购买</Text>
            <Text style={styles.paymentStatus}>已接入</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>当前状态</Text>
            <Text style={styles.paymentStatus}>{snapshot.status === 'pending_payment' ? '待支付' : '支付成功自动开通'}</Text>
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
  planGrid: { gap: 10, marginBottom: 12 },
  planCard: { borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFFFFF' },
  planCardSelected: { borderColor: '#07C160', backgroundColor: '#F2FFF7' },
  planCardFeatured: { borderColor: '#B7E9C9' },
  planCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 },
  planName: { color: '#111111', fontSize: 16, fontWeight: '700' },
  planBadge: { color: '#07C160', fontSize: 12, fontWeight: '700', backgroundColor: '#E8F8EF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  planPriceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 },
  planCurrency: { color: '#111111', fontSize: 18, fontWeight: '800', marginBottom: 3 },
  planPrice: { color: '#111111', fontSize: 32, fontWeight: '800', lineHeight: 36 },
  planCycle: { color: '#6B6B6B', fontSize: 13, marginLeft: 5, marginBottom: 6 },
  planCaption: { color: '#6B6B6B', fontSize: 12, lineHeight: 17 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  currency: { color: '#111111', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  price: { color: '#111111', fontSize: 44, fontWeight: '800', lineHeight: 50 },
  cycle: { color: '#6B6B6B', fontSize: 15, marginLeft: 6, marginBottom: 8 },
  planHint: { color: '#4F4F4F', fontSize: 14, lineHeight: 21, marginBottom: 16 },
  planHintSmall: { color: '#8A8A8A', fontSize: 12, lineHeight: 18, marginTop: -8, marginBottom: 14 },
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
  giftRow: { minHeight: 38, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F1F1' },
  giftTitle: { color: '#4F4F4F', fontSize: 14 },
  giftValue: { color: '#07C160', fontSize: 14, fontWeight: '700' },
  secondaryButton: { minHeight: 46, borderRadius: 23, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  secondaryButtonText: { color: '#111111', fontSize: 14, fontWeight: '600' },
});
