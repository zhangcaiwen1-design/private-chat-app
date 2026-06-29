import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  FALLBACK_MEMBERSHIP_PLANS,
  isActiveMembership,
  refreshMembershipPlans,
  refreshMembershipStatus,
} from '../../services/MembershipService';
import {
  getAvailableIosSubscriptionProducts,
  getIosSubscriptionSetup,
  purchaseIosSubscription,
  restoreIosSubscriptions,
} from '../../services/IosSubscriptionService';
import { getLegalDocumentUrls } from '../../services/IosSubscriptionConfig';

const BENEFITS = [
  { icon: 'chatbubbles-outline', title: '私密聊天', subtitle: '开通后即可进入聊天界面' },
  { icon: 'happy-outline', title: '表情包', subtitle: '可发送内置小表情' },
  { icon: 'cloud-done-outline', title: '云备份恢复', subtitle: '聊天记录可上传和恢复' },
  { icon: 'phone-portrait-outline', title: '账号同步', subtitle: '多设备登录时同步会员状态' },
  { icon: 'lock-closed-outline', title: '应用锁定', subtitle: '支持快速锁定和本机密码保护' },
];

function formatExpireTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
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
      hint: '完成支付后回到这里刷新状态即可。',
      icon: 'card-outline',
      color: '#3B82F6',
    };
  }

  if (snapshot.status === 'expired') {
    return {
      title: '已到期',
      hint: '续费后可恢复聊天增强和云端能力。',
      icon: 'alert-circle-outline',
      color: '#FA5151',
    };
  }

  return {
    title: '未开通',
    hint: '开通会员后可使用完整会员能力。',
    icon: 'lock-closed-outline',
    color: '#111111',
  };
}

function formatPlanCaption(plan) {
  if (!plan) return '';
  if (plan.code === 'quarterly_99') return '适合三个月连续使用';
  if (plan.code === 'annual_299') return '适合长期稳定使用';
  return '标准自动续费月卡';
}

function getIosSummaryText(iosSubscriptionSetup) {
  if (!iosSubscriptionSetup.enabled) {
    return '当前版本暂未启用 iOS 应用内订阅，聊天和基础功能可以直接体验。';
  }

  if (iosSubscriptionSetup.mode === 'revenuecat') {
    return 'iOS 版本将通过 Apple 应用内订阅开通会员，价格与 App Store Connect 中已创建的月卡、季卡和年卡保持一致。';
  }

  return 'iOS 版本将通过 Apple 应用内订阅开通会员。';
}

export default function MembershipCenter({ onBack, onLock, onMembershipActive, onSwitchAccount, isRequired = false }) {
  const insets = useSafeAreaInsets();
  const [snapshot, setSnapshot] = useState({ tier: 'free', status: 'inactive', expire_at: null, pending_order: null });
  const [plans, setPlans] = useState(FALLBACK_MEMBERSHIP_PLANS);
  const [selectedPlanCode, setSelectedPlanCode] = useState('monthly_39_9');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const active = isActiveMembership(snapshot);
  const isIos = Platform.OS === 'ios';
  const iosSubscriptionSetup = getIosSubscriptionSetup();
  const legalUrls = getLegalDocumentUrls();
  const statusCopy = getStatusCopy(snapshot);
  const showPlanOptions = !isIos || iosSubscriptionSetup.enabled;

  const selectedPlan = useMemo(
    () => plans.find((item) => item.code === selectedPlanCode) || plans[0] || FALLBACK_MEMBERSHIP_PLANS[0],
    [plans, selectedPlanCode],
  );

  const load = useCallback(async ({ showError = true } = {}) => {
    setLoading(true);
    try {
      const membership = await refreshMembershipStatus();
      let loadedPlans = await refreshMembershipPlans();

      if (isIos && iosSubscriptionSetup.enabled) {
        const iosPlans = await getAvailableIosSubscriptionProducts();
        if (iosPlans?.length) {
          loadedPlans = iosPlans;
        }
      }

      setSnapshot(membership);
      const nextPlans = loadedPlans?.length ? loadedPlans : membership.available_plans || FALLBACK_MEMBERSHIP_PLANS;
      setPlans(nextPlans);
      if (!nextPlans.some((item) => item.code === selectedPlanCode)) {
        setSelectedPlanCode(nextPlans[0]?.code || 'monthly_39_9');
      }
      return membership;
    } catch (error) {
      if (showError) {
        Alert.alert('加载失败', error.message || '无法获取会员状态。');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [isIos, iosSubscriptionSetup.enabled, selectedPlanCode]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isRequired && active) {
      onMembershipActive && onMembershipActive();
    }
  }, [active, isRequired, onMembershipActive]);

  const handleRestorePurchases = async () => {
    if (!isIos || !iosSubscriptionSetup.enabled) {
      return;
    }

    setRestoring(true);
    try {
      const result = await restoreIosSubscriptions();
      setSnapshot(result.snapshot);
      if (isActiveMembership(result.snapshot)) {
        Alert.alert('恢复成功', '已恢复你的 Apple 订阅会员状态。');
        onMembershipActive && onMembershipActive();
        return;
      }
      Alert.alert('未恢复到有效订阅', '当前 Apple 账号下没有可用的会员订阅。');
    } catch (error) {
      Alert.alert('恢复失败', error.message || '暂时无法恢复购买。');
    } finally {
      setRestoring(false);
    }
  };

  const handleOpenLink = async (url) => {
    if (!url) {
      Alert.alert('链接暂不可用', '请先补充正式的协议地址。');
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('打开失败', '当前无法打开这个链接。');
    }
  };

  const handlePrimaryAction = async () => {
    if (isIos) {
      if (!iosSubscriptionSetup.enabled) {
        onMembershipActive && onMembershipActive();
        return;
      }

      if (active) {
        onMembershipActive && onMembershipActive();
        return;
      }

      setSubmitting(true);
      try {
        const result = await purchaseIosSubscription(selectedPlan.code);
        setSnapshot(result.snapshot);
        if (isActiveMembership(result.snapshot)) {
          Alert.alert('开通成功', 'Apple 订阅已生效。');
          onMembershipActive && onMembershipActive();
          return;
        }
        Alert.alert('订阅未完成', '购买已发起，但会员状态还未更新，请稍后再试。');
      } catch (error) {
        Alert.alert('订阅失败', error.message || '暂时无法完成 Apple 订阅。');
      } finally {
        setSubmitting(false);
      }
      return;
    }

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
      `当前选择：${selectedPlan.name} ¥${selectedPlan.amount}。支付成功后系统会自动开通会员，回到这里刷新即可同步状态。`,
    );
  };

  const primaryLabel = active
    ? '进入聊天'
    : isIos
      ? (iosSubscriptionSetup.enabled ? `订阅 ${selectedPlan.name}` : '继续使用')
      : snapshot.status === 'pending_payment'
        ? '查看支付状态'
        : `去小程序购买 ¥${selectedPlan.amount}`;

  const busy = loading || submitting || restoring;

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
          <Text style={styles.planLabel}>{isIos ? (showPlanOptions ? '选择订阅方案' : '当前版本说明') : '选择会员套餐'}</Text>
          {isIos ? <Text style={styles.planHint}>{getIosSummaryText(iosSubscriptionSetup)}</Text> : null}
          {showPlanOptions ? (
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
                    <Text style={styles.planCaption}>{plan.summary || formatPlanCaption(plan)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.inlineNote}>
              <Ionicons name="information-circle-outline" size={18} color="#4F4F4F" />
              <Text style={styles.inlineNoteText}>这次 iOS 送审先不展示订阅购买入口，聊天、联系人和锁定流程可直接体验。</Text>
            </View>
          )}

          {!isIos ? (
            <Text style={styles.planHint}>开通后聊天、表情包、图片语音、云备份和账号同步都会包含。</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, busy && styles.primaryButtonDisabled]}
            onPress={handlePrimaryAction}
            disabled={busy}
            activeOpacity={0.86}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{primaryLabel}</Text>}
          </TouchableOpacity>

          {isIos && iosSubscriptionSetup.enabled ? (
            <TouchableOpacity
              style={[styles.secondaryActionButton, restoring && styles.secondaryActionButtonDisabled]}
              onPress={handleRestorePurchases}
              disabled={restoring || loading || submitting}
              activeOpacity={0.84}
            >
              <Text style={styles.secondaryActionButtonText}>恢复已购订阅</Text>
            </TouchableOpacity>
          ) : null}

          {isIos ? (
            <View style={styles.legalLinksRow}>
              <TouchableOpacity onPress={() => handleOpenLink(legalUrls.privacyPolicy)} activeOpacity={0.8}>
                <Text style={styles.legalLinkText}>隐私政策</Text>
              </TouchableOpacity>
              <Text style={styles.legalDivider}>·</Text>
              <TouchableOpacity onPress={() => handleOpenLink(legalUrls.termsOfUse)} activeOpacity={0.8}>
                <Text style={styles.legalLinkText}>服务条款</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isRequired && !active ? <Text style={styles.requiredHint}>未开通会员时只能停留在登录和订阅页。</Text> : null}
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

        {!isIos ? (
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
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>iOS 订阅说明</Text>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>购买方式</Text>
              <Text style={styles.paymentStatus}>{iosSubscriptionSetup.enabled ? 'Apple 应用内订阅' : '当前版本未启用'}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>会员同步</Text>
              <Text style={styles.paymentStatus}>与当前账号绑定</Text>
            </View>
          </View>
        )}

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
  inlineNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F7F7F7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12 },
  inlineNoteText: { flex: 1, color: '#4F4F4F', fontSize: 13, lineHeight: 19 },
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
  planHint: { color: '#4F4F4F', fontSize: 14, lineHeight: 21, marginBottom: 16 },
  primaryButton: { minHeight: 48, borderRadius: 24, backgroundColor: '#07C160', justifyContent: 'center', alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.66 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryActionButton: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: '#D9D9D9', justifyContent: 'center', alignItems: 'center', marginTop: 10, backgroundColor: '#FFFFFF' },
  secondaryActionButtonDisabled: { opacity: 0.66 },
  secondaryActionButtonText: { color: '#111111', fontSize: 14, fontWeight: '600' },
  legalLinksRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 8 },
  legalLinkText: { color: '#3B82F6', fontSize: 13, fontWeight: '500' },
  legalDivider: { color: '#9CA3AF', fontSize: 13 },
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
