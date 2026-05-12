import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getRelationshipRitualSummary } from '../../services/RitualService';

function formatDay(day) {
  return day ? day.slice(5).replace('-', '.') : '';
}

function buildMilestoneIcon(type) {
  if (type === 'relationship_started') return 'heart';
  if (type === 'late_night_long_talk') return 'moon';
  return 'chatbubble-ellipses';
}

export default function RitualCenter({ contact, onBack, onLock }) {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let active = true;
    getRelationshipRitualSummary(contact.id)
      .then((result) => {
        if (active) {
          setSummary(result);
        }
      })
      .catch((error) => {
        if (active) {
          Alert.alert('加载失败', error.message || '无法加载双人仪式记录');
        }
      });

    return () => {
      active = false;
    };
  }, [contact.id]);

  const calendarPreview = useMemo(() => {
    if (!summary) {
      return [];
    }
    return summary.calendarDays.slice(0, 12);
  }, [summary]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack} accessibilityLabel="返回会话列表">
          <Ionicons name="chevron-back" size={24} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.title}>双人仪式</Text>
        <TouchableOpacity style={styles.headerButton} onPress={onLock} accessibilityLabel="锁定应用">
          <Text style={styles.lockButtonText}>锁定</Text>
        </TouchableOpacity>
      </View>

      {!summary ? null : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>只对你们可见</Text>
            <Text style={styles.heroTitle}>{summary.contact_name}</Text>
            <Text style={styles.heroSubtitle}>把每一次认真互动，都变成关系里的小纪念</Text>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>爱心值</Text>
              <Text style={styles.metricValue}>{summary.love_value}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>连续互动</Text>
              <Text style={styles.metricValue}>{summary.current_streak_days}天</Text>
              <Text style={styles.metricHint}>最高 {summary.best_streak_days} 天</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>最长深夜长谈</Text>
              <Text style={styles.metricValue}>{summary.longest_late_night_minutes}分</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>关系里程碑</Text>
            {summary.milestones.map((item) => (
              <View key={`${item.type}-${item.event_at}`} style={styles.milestoneRow}>
                <View style={styles.milestoneIcon}>
                  <Ionicons name={buildMilestoneIcon(item.type)} size={16} color="#F56C8D" />
                </View>
                <View style={styles.milestoneBody}>
                  <Text style={styles.milestoneLabel}>{item.label}</Text>
                  <Text style={styles.milestoneMeta}>{formatDay(item.event_day)} · +{item.value_delta} 爱心值</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>关系日历</Text>
            <View style={styles.calendarGrid}>
              {calendarPreview.map((item) => (
                <View key={item.event_day} style={styles.calendarCell}>
                  <Text style={styles.calendarDay}>{formatDay(item.event_day)}</Text>
                  <Text style={styles.calendarCount}>{item.event_count}次互动</Text>
                  <Text style={styles.calendarValue}>+{item.day_value || 0}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
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
  heroEyebrow: { color: '#F56C8D', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  heroTitle: { color: '#111111', fontSize: 24, fontWeight: '700', marginBottom: 6 },
  heroSubtitle: { color: '#5F6368', fontSize: 14, lineHeight: 20 },
  metricRow: { gap: 10, marginBottom: 12 },
  metricCard: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16 },
  metricLabel: { color: '#7A7A7A', fontSize: 13, marginBottom: 8 },
  metricValue: { color: '#111111', fontSize: 24, fontWeight: '700' },
  metricHint: { color: '#9A9A9A', fontSize: 12, marginTop: 6 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 12 },
  sectionTitle: { color: '#111111', fontSize: 17, fontWeight: '600', marginBottom: 12 },
  milestoneRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F3F3' },
  milestoneIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF1F5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  milestoneBody: { flex: 1 },
  milestoneLabel: { color: '#222222', fontSize: 15, lineHeight: 21, marginBottom: 4 },
  milestoneMeta: { color: '#909090', fontSize: 12 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  calendarCell: { width: '47%', backgroundColor: '#F7F7F7', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12 },
  calendarDay: { color: '#111111', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  calendarCount: { color: '#666666', fontSize: 12, marginBottom: 4 },
  calendarValue: { color: '#07C160', fontSize: 12, fontWeight: '600' },
});
