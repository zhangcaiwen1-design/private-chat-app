import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteFromCloud, downloadFromCloud, getCloudBackups, restoreFromCloud } from '../../services/CloudService';
import { refreshMembershipStatus } from '../../services/MembershipService';

function formatCloudTime(timestamp) {
  if (!timestamp) return '时间未知';
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

function formatCloudSource(source) {
  if (source === 'manual_backup') return '手动备份';
  return '聊天自动上云';
}

export default function CloudRecords({ onBack, onLock, onRestoreToLocal, onOpenMembership }) {
  const insets = useSafeAreaInsets();
  const [backups, setBackups] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [membership, setMembership] = useState({ tier: 'free', status: 'inactive', expire_at: null });
  const [previewItem, setPreviewItem] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const snapshot = await refreshMembershipStatus();
    setMembership(snapshot);

    try {
      const data = await getCloudBackups();
      setBackups(data.reverse());
      setErrorMessage('');
    } catch (error) {
      setBackups([]);
      setErrorMessage(error.message || '无法加载云端记录');
    }
  };

  const handleDownload = async (item) => {
    try {
      const result = await downloadFromCloud(item.id);
      if (item.type === 'text') {
        setPreviewItem({
          ...item,
          content: result.backup?.content || item.content,
        });
        return;
      }
      if (item.type === 'image') {
        setPreviewItem({
          ...item,
          uri: result.url || result.backup?.uri || item.uri,
        });
        return;
      }
      if (item.type === 'voice') {
        setPreviewItem({
          ...item,
          uri: result.url || result.backup?.uri || item.uri || item.content,
          duration: result.backup?.duration || item.duration,
        });
        return;
      }
      Alert.alert('下载准备完成', result.url || item.content || '云端内容已可用');
    } catch (error) {
      Alert.alert('下载失败', error.message || '无法下载云端记录');
    }
  };

  const handleDelete = async (item) => {
    try {
      await deleteFromCloud(item.id);
      setPreviewItem(null);
      await load();
    } catch (error) {
      Alert.alert('删除失败', error.message || '无法删除云端记录');
    }
  };

  const handleRestore = async (item) => {
    if (item.restored_at) {
      return;
    }

    try {
      const message = await restoreFromCloud(item.id);
      await load();
      if (onRestoreToLocal) {
        onRestoreToLocal({
          contactId: item.contact_id,
          conversationId: item.conversation_id,
          contactName: item.contact_name,
          message,
        });
      }
    } catch (error) {
      Alert.alert('恢复失败', error.message || '无法恢复云端记录');
    }
  };

  const filteredBackups = activeFilter === 'all'
    ? backups
    : backups.filter((item) => item.type === activeFilter);

  const filterHint = activeFilter === 'all'
    ? '查看全部'
    : activeFilter === 'text'
      ? '仅看文字'
      : activeFilter === 'image'
        ? '仅看图片'
        : '仅看语音';

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => handleDownload(item)}>
      <View style={styles.itemLeft}>
        {item.type === 'image' ? (
          <Image source={{ uri: item.uri || item.content }} style={styles.thumb} />
        ) : item.type === 'voice' ? (
          <View style={styles.voiceThumb}><Text style={styles.voiceIcon}>🎤</Text></View>
        ) : (
          <View style={styles.textThumb}><Text style={styles.textLabel}>💬</Text></View>
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemType}>
          {item.type === 'image' ? '图片' : item.type === 'voice' ? '语音 ' + item.duration + '″' : '文字'}
        </Text>
        <Text style={styles.itemPreview} numberOfLines={1}>
          {item.type === 'text' ? item.content : item.type === 'image' ? '已保存图片' : '已保存语音'}
        </Text>
        <Text style={styles.itemMeta} numberOfLines={1}>{item.contact_name || '未知联系人'}</Text>
        <Text style={styles.itemDate}>{formatCloudSource(item.source)} · {formatCloudTime(item.created_at)}</Text>
        {item.restored_at ? <Text style={styles.restoredTag}>已恢复到本地</Text> : null}
      </View>
      <Text style={styles.cloudTag}>↓</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={onBack} accessibilityLabel="返回会话列表"><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.title}>云端记录</Text>
        <TouchableOpacity style={styles.headerButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={onLock} accessibilityLabel="锁定应用"><Text style={styles.lockButtonText}>锁定</Text></TouchableOpacity>
      </View>
      <View style={styles.tierCard}>
        <Text style={styles.tierLabel}>云端同步状态</Text>
        <Text style={styles.tierValue}>{membership.tier === 'paid' && membership.status === 'active' ? '云端同步已开启' : membership.status === 'pending_review' ? '会员申请待审核' : '仅保留本地记录'}</Text>
        <Text style={styles.tierHint}>
          {membership.tier === 'paid' && membership.status === 'active'
            ? '新消息会自动保存到云端，可随时恢复到本地。'
            : membership.status === 'pending_review'
              ? '你的付款凭证已提交，我们审核通过后会自动开启云同步。'
              : '当前设备仅保留本地私密记录，开通会员后可自动同步到云端。'}
        </Text>
        {membership.tier !== 'paid' || membership.status !== 'active' ? (
          <TouchableOpacity style={styles.upgradeButton} onPress={onOpenMembership}>
            <Text style={styles.upgradeButtonText}>{membership.status === 'pending_review' ? '查看会员申请' : '开通会员'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.filterCard}>
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterButton, activeFilter === 'all' && styles.filterButtonActive]} onPress={() => setActiveFilter('all')}>
            <Text style={[styles.filterButtonText, activeFilter === 'all' && styles.filterButtonTextActive]}>全部</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, activeFilter === 'text' && styles.filterButtonActive]} onPress={() => setActiveFilter('text')}>
            <Text style={[styles.filterButtonText, activeFilter === 'text' && styles.filterButtonTextActive]}>文字</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, activeFilter === 'image' && styles.filterButtonActive]} onPress={() => setActiveFilter('image')}>
            <Text style={[styles.filterButtonText, activeFilter === 'image' && styles.filterButtonTextActive]}>图片</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, activeFilter === 'voice' && styles.filterButtonActive]} onPress={() => setActiveFilter('voice')}>
            <Text style={[styles.filterButtonText, activeFilter === 'voice' && styles.filterButtonTextActive]}>语音</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.filterHint}>{filterHint}</Text>
      </View>
      <FlatList
        data={filteredBackups}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            {renderItem({ item })}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.restoreButton, item.restored_at && styles.restoreButtonDisabled]}
                onPress={() => handleRestore(item)}
                disabled={Boolean(item.restored_at)}
              >
                <Text style={[styles.restoreButtonText, item.restored_at && styles.restoreButtonTextDisabled]}>{item.restored_at ? '已恢复' : '恢复到本地'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
                <Text style={styles.deleteButtonText}>删除</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>☁️</Text>
            <Text style={styles.emptyText}>{errorMessage || '暂无云端记录'}</Text>
            <Text style={styles.emptyHint}>{errorMessage ? '升级付费会员后可自动保存并下载聊天记录与图片' : '付费会员发送后会自动保存到云端'}</Text>
          </View>
        }
      />
      <Modal transparent visible={Boolean(previewItem)} animationType="fade" onRequestClose={() => setPreviewItem(null)}>
        <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreviewItem(null)}>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{previewItem?.type === 'image' ? '云端图片预览' : previewItem?.type === 'voice' ? '云端语音预览' : '云端内容预览'}</Text>
            {previewItem?.type === 'image' ? (
              <Image source={{ uri: previewItem.uri }} style={styles.previewImage} resizeMode="contain" />
            ) : previewItem?.type === 'voice' ? (
              <View style={styles.previewVoiceCard}>
                <Text style={styles.previewVoiceIcon}>🎤</Text>
                <Text style={styles.previewVoiceDuration}>{previewItem?.duration || 0}″</Text>
                <Text style={styles.previewVoiceUri}>{previewItem?.uri}</Text>
              </View>
            ) : (
              <Text style={styles.previewBody}>{previewItem?.content}</Text>
            )}
            <TouchableOpacity style={styles.previewButton} onPress={() => setPreviewItem(null)}>
              <Text style={styles.previewButtonText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDEDED' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 10, backgroundColor: '#F6F6F6', borderBottomWidth: 1, borderBottomColor: '#D8D8D8' },
  headerButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  back: { color: '#111111', fontSize: 30, fontWeight: '300', marginTop: -2 },
  title: { color: '#111111', fontSize: 18, fontWeight: '600' },
  lockButtonText: { color: '#111111', fontSize: 14, fontWeight: '500' },
  tierCard: { marginHorizontal: 0, marginTop: 0, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F6F6F6', borderBottomWidth: 1, borderBottomColor: '#E3E3E3' },
  tierLabel: { color: '#07C160', fontSize: 12, marginBottom: 5, fontWeight: '600' },
  tierValue: { color: '#222222', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  tierHint: { color: '#8A8A8A', fontSize: 13, lineHeight: 18 },
  upgradeButton: { alignSelf: 'flex-start', minHeight: 36, marginTop: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: '#95EC69', justifyContent: 'center', alignItems: 'center' },
  upgradeButtonText: { color: '#1E320E', fontSize: 13, fontWeight: '600' },
  filterCard: { backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center' },
  filterButtonActive: { backgroundColor: '#DFF5D1' },
  filterButtonText: { color: '#666666', fontSize: 13, fontWeight: '500' },
  filterButtonTextActive: { color: '#1F3A0D', fontWeight: '600' },
  filterHint: { color: '#9B9B9B', fontSize: 12, marginTop: 8 },
  list: { flexGrow: 1, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  itemRow: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F1F1' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, backgroundColor: '#FFFFFF' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 14, paddingBottom: 12 },
  itemLeft: { marginRight: 12 },
  thumb: { width: 50, height: 50, borderRadius: 8 },
  voiceThumb: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#F4F4F4', justifyContent: 'center', alignItems: 'center' },
  voiceIcon: { fontSize: 18, color: '#666666' },
  textThumb: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#EAF9F0', justifyContent: 'center', alignItems: 'center' },
  textLabel: { fontSize: 18, color: '#07C160' },
  itemInfo: { flex: 1 },
  itemType: { color: '#111111', fontSize: 16, marginBottom: 4, fontWeight: '500' },
  itemPreview: { color: '#666666', fontSize: 14, marginBottom: 4 },
  itemMeta: { color: '#8C8C8C', fontSize: 13, marginBottom: 4 },
  itemDate: { color: '#B0B0B0', fontSize: 12 },
  restoredTag: { color: '#07C160', fontSize: 12, marginTop: 4, fontWeight: '600' },
  cloudTag: { fontSize: 18, color: '#B0B0B0' },
  restoreButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#95EC69', justifyContent: 'center', alignItems: 'center' },
  restoreButtonDisabled: { backgroundColor: '#F0F0F0' },
  restoreButtonText: { color: '#1E320E', fontSize: 13, fontWeight: '600' },
  restoreButtonTextDisabled: { color: '#999999' },
  deleteButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center' },
  deleteButtonText: { color: '#666666', fontSize: 13, fontWeight: '500' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120, backgroundColor: '#FFFFFF' },
  emptyIcon: { fontSize: 44, marginBottom: 14, color: '#07C160' },
  emptyText: { color: '#222222', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyHint: { color: '#8A8A8A', fontSize: 14 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  previewCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  previewTitle: { color: '#111111', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  previewBody: { color: '#333333', fontSize: 15, lineHeight: 24, marginBottom: 18 },
  previewImage: { width: '100%', height: 280, borderRadius: 10, backgroundColor: '#F4F4F4', marginBottom: 18 },
  previewVoiceCard: { alignItems: 'center', backgroundColor: '#F7F7F7', borderRadius: 12, paddingVertical: 24, paddingHorizontal: 16, marginBottom: 18 },
  previewVoiceIcon: { fontSize: 32, marginBottom: 10, color: '#07C160' },
  previewVoiceDuration: { color: '#111111', fontSize: 22, fontWeight: '700', marginBottom: 10 },
  previewVoiceUri: { color: '#666666', fontSize: 13, textAlign: 'center' },
  previewButton: { alignSelf: 'flex-end', minHeight: 40, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#95EC69', justifyContent: 'center', alignItems: 'center' },
  previewButtonText: { color: '#1E320E', fontSize: 14, fontWeight: '600' },
});
