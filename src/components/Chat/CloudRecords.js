import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { getCloudBackups } from '../../services/CloudService';

export default function CloudRecords({ onBack }) {
  const [backups, setBackups] = useState([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await getCloudBackups();
    setBackups(data.reverse());
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.itemLeft}>
        {item.type === 'image' ? (
          <Image source={{ uri: item.uri }} style={styles.thumb} />
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
        <Text style={styles.itemDate}>云端 · 已加密</Text>
      </View>
      <Text style={styles.cloudTag}>☁️</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.title}>云端记录</Text>
        <View style={{ width: 36 }} />
      </View>
      <FlatList data={backups} renderItem={renderItem} keyExtractor={item => String(item.id)} contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>☁️</Text><Text style={styles.emptyText}>暂无云端记录</Text><Text style={styles.emptyHint}>长按消息选择"上云备份"即可保存</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDEDED' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F7F7F7', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  back: { color: '#07C160', fontSize: 36, fontWeight: '300' },
  title: { color: '#333', fontSize: 18, fontWeight: '600' },
  list: { flexGrow: 1, paddingVertical: 10 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itemLeft: { marginRight: 14 },
  thumb: { width: 50, height: 50, borderRadius: 6 },
  voiceThumb: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#F7F7F7', justifyContent: 'center', alignItems: 'center' },
  voiceIcon: { fontSize: 22 },
  textThumb: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#F7F7F7', justifyContent: 'center', alignItems: 'center' },
  textLabel: { fontSize: 22 },
  itemInfo: { flex: 1 },
  itemType: { color: '#333', fontSize: 16, marginBottom: 4 },
  itemDate: { color: '#B2B2B2', fontSize: 13 },
  cloudTag: { fontSize: 20 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyText: { color: '#333', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyHint: { color: '#888', fontSize: 14 },
});