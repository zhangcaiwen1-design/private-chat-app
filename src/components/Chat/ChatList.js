import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, SafeAreaView, StatusBar, Alert } from 'react-native';
import { getContacts, saveContact } from '../../services/StorageService';
import MyQRCode from '../QRCode/MyQRCode';
import QRScanner from '../QRCode/QRScanner';

export default function ChatList({ onLock, navigation }) {
  const [contacts, setContacts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalType, setQrModalType] = useState('my');
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const currentUserId = 'USER123';

  const loadContacts = useCallback(async () => {
    const loadedContacts = await getContacts();
    setContacts(loadedContacts);
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const handleAddContact = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    await saveContact({ name: newName.trim(), phone: newPhone.trim() });
    setNewName('');
    setNewPhone('');
    setModalVisible(false);
    loadContacts();
  };

  const handleQRScanned = async (userId) => {
    setShowQRModal(false);
    Alert.prompt('添加联系人', `是否将 QR-${userId} 添加为联系人？`, [
      { text: '取消', style: 'cancel' },
      { text: '添加', onPress: async (name) => { if (name && name.trim()) { await saveContact({ name: name.trim(), phone: `QR-${userId}` }); loadContacts(); } } },
    ], 'plain-text', userId);
  };

  const renderContact = ({ item }) => (
    <TouchableOpacity style={styles.contactItem} onPress={() => navigation && navigation.navigate('ChatWindow', { contact: item })}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.slice(0, 1)}</Text></View>
      <View style={styles.contactInfo}>
        <View style={styles.contactTop}>
          <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.time}>上午 10:30</Text>
        </View>
        <Text style={styles.preview} numberOfLines={1}>你好啊，最近怎么样？</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.title}>微信</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={contacts} renderItem={renderContact} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>暂无联系人</Text>
            <Text style={styles.emptyHint}>点击右上角 + 添加好友</Text>
          </View>
        }
      />

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIcon}>💬</Text>
          <Text style={styles.tabText}>微信</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIcon}>👥</Text>
          <Text style={styles.tabText}>通讯录</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIcon}>🤖</Text>
          <Text style={styles.tabText}>我</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.fab} onPress={() => setActionSheetVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>添加联系人</Text>
            <TextInput style={styles.input} placeholder="姓名" placeholderTextColor="#BBBBBB" value={newName} onChangeText={setNewName} />
            <TextInput style={styles.input} placeholder="手机号" placeholderTextColor="#BBBBBB" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setNewName(''); setNewPhone(''); setModalVisible(false); }}>
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.addButton]} onPress={handleAddContact}>
                <Text style={styles.modalButtonText}>添加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={actionSheetVisible} transparent={true} animationType="fade" onRequestClose={() => setActionSheetVisible(false)}>
        <TouchableOpacity style={styles.actionSheetOverlay} activeOpacity={1} onPress={() => setActionSheetVisible(false)}>
          <View style={styles.actionSheetContent}>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { setActionSheetVisible(false); setQrModalType('my'); setShowQRModal(true); }}>
              <View style={styles.actionSheetIconBg}><Text style={styles.actionSheetIcon}>⬜</Text></View>
              <Text style={styles.actionSheetItemText}>我的二维码</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { setActionSheetVisible(false); setQrModalType('scan'); setShowQRModal(true); }}>
              <View style={styles.actionSheetIconBg}><Text style={styles.actionSheetIcon}>📷</Text></View>
              <Text style={styles.actionSheetItemText}>扫一扫</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { setActionSheetVisible(false); setModalVisible(true); }}>
              <View style={styles.actionSheetIconBg}><Text style={styles.actionSheetIcon}>📱</Text></View>
              <Text style={styles.actionSheetItemText}>手机号添加</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.lockButtonAction} onPress={onLock}>
              <View style={styles.actionSheetIconBg}><Text style={styles.actionSheetIcon}>🔒</Text></View>
              <Text style={styles.actionSheetItemText}>锁定</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetCancel} onPress={() => setActionSheetVisible(false)}>
              <Text style={styles.actionSheetCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showQRModal} transparent={true} animationType="fade" onRequestClose={() => setShowQRModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowQRModal(false)}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            {qrModalType === 'my' ? <MyQRCode userId={currentUserId} /> : <QRScanner onScanned={handleQRScanned} />}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDEDED' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF' },
  title: { color: '#333333', fontSize: 22, fontWeight: '600' },
  searchButton: { padding: 4 },
  searchIcon: { fontSize: 22 },
  listContent: { flexGrow: 1, backgroundColor: '#EDEDED' },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8E8E8' },
  avatar: { width: 48, height: 48, borderRadius: 6, backgroundColor: '#07C160', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  contactInfo: { flex: 1 },
  contactTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  contactName: { color: '#333333', fontSize: 17, fontWeight: '600' },
  time: { color: '#BBBBBB', fontSize: 12 },
  preview: { color: '#888888', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 140 },
  emptyIcon: { fontSize: 52, marginBottom: 18 },
  emptyTitle: { color: '#333333', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyHint: { color: '#888888', fontSize: 14 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E8E8E8', paddingVertical: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabIcon: { fontSize: 22, marginBottom: 2 },
  tabText: { color: '#07C160', fontSize: 12 },
  fab: { position: 'absolute', right: 20, bottom: 70, width: 56, height: 56, borderRadius: 28, backgroundColor: '#07C160', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6 },
  fabText: { color: '#FFFFFF', fontSize: 30, fontWeight: '300' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '84%', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24 },
  modalTitle: { color: '#333333', fontSize: 18, fontWeight: '600', marginBottom: 22, textAlign: 'center' },
  input: { backgroundColor: '#F7F7F7', color: '#333333', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modalButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#F0F0F0', marginRight: 8 },
  addButton: { backgroundColor: '#07C160', marginLeft: 8 },
  modalButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  actionSheetOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  actionSheetContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 28, paddingTop: 16 },
  actionSheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  actionSheetIconBg: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#07C160', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  actionSheetIcon: { fontSize: 18 },
  actionSheetItemText: { color: '#333333', fontSize: 17 },
  lockButtonAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  actionSheetCancel: { marginTop: 10, paddingVertical: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  actionSheetCancelText: { color: '#888888', fontSize: 17 },
  qrModalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '84%', maxWidth: 340, alignItems: 'center' },
  closeButton: { position: 'absolute', top: 14, right: 18, padding: 4 },
  closeButtonText: { color: '#888888', fontSize: 20 },
});