import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, StatusBar, Alert, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { lookupPhone } from '../../services/ApiService';
import { acceptConversationRequest, createConversation, listConversations, listIncomingConversationRequests } from '../../services/ChatRepository';
import { refreshMembershipStatus } from '../../services/MembershipService';

const FRIEND_REQUEST_SEEN_COUNT_KEY = 'friend_request_seen_count';

export default function ChatList({ onLock, navigation, onOpenCloud, onOpenRituals, onOpenMembership, onOpenPhoneSettings, onOpenUnlockPinSettings, refreshToken = 0 }) {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneLookupResult, setPhoneLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [seenRequestCount, setSeenRequestCount] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('messages');
  const [activePanel, setActivePanel] = useState('root');

  const loadContacts = useCallback(async ({ showAlert = false } = {}) => {
    try {
      const [loadedContacts, requests] = await Promise.all([
        listConversations(),
        listIncomingConversationRequests(),
        refreshMembershipStatus().catch(() => null),
      ]);
      const sortedContacts = [...loadedContacts].sort((left, right) => {
        if (left.syncState === 'request_sent' && right.syncState !== 'request_sent') return -1;
        if (left.syncState !== 'request_sent' && right.syncState === 'request_sent') return 1;
        return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
      });
      setContacts(sortedContacts);
      setIncomingRequests(requests);
    } catch (error) {
      setContacts([]);
      setIncomingRequests([]);
      if (showAlert) {
        Alert.alert('加载失败', error.message || '无法加载当前聊天与联系人');
      }
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts, refreshToken]);

  useEffect(() => {
    AsyncStorage.getItem(FRIEND_REQUEST_SEEN_COUNT_KEY).then((value) => {
      const parsed = Number(value || 0);
      if (!Number.isNaN(parsed)) {
        setSeenRequestCount(parsed);
      }
    }).catch(() => {});
  }, []);

  const resetAddFriendState = () => {
    setNewName('');
    setPhoneInput('');
    setPhoneLookupResult(null);
    setLookupLoading(false);
  };

  const handleLookupPhone = async () => {
    const contactPhone = phoneInput.trim();
    if (!contactPhone) {
      Alert.alert('请输入手机号');
      return;
    }

    setLookupLoading(true);
    try {
      const result = await lookupPhone(contactPhone);
      if (!result.exists || !result.user) {
        setPhoneLookupResult(null);
        Alert.alert('未找到用户');
        return;
      }
      setPhoneLookupResult(result.user);
      if (!newName.trim()) {
        setNewName(result.user.nickname || '');
      }
    } catch (error) {
      Alert.alert('查找失败', error.message || '无法搜索该手机号');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAddContact = async () => {
    const contactName = newName.trim() || phoneLookupResult?.nickname || '';
    const contactPhone = phoneInput.trim();
    if (!contactPhone) {
      Alert.alert('请输入手机号');
      return;
    }
    if (!phoneLookupResult?.id) {
      Alert.alert('请先搜索手机号', '确认查到对方后再发送好友申请');
      return;
    }
    try {
      const result = await createConversation({
        name: contactName,
        phone: contactPhone,
        peerUserId: phoneLookupResult.id,
      });
      resetAddFriendState();
      setModalVisible(false);
      await loadContacts();
      openConversation(result.contact);
    } catch (error) {
      Alert.alert('添加失败', error.message || '无法发送好友申请');
    }
  };

  const openConversation = (contact) => {
    if (!contact || !navigation) {
      return;
    }
    navigation.navigate('ChatWindow', { contact });
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const acceptedContact = await acceptConversationRequest(requestId);
      await loadContacts();
      openConversation(acceptedContact);
    } catch (error) {
      Alert.alert('处理失败', error.message || '无法通过好友申请');
    }
  };

  const markRequestsAsSeen = useCallback(async (count) => {
    setSeenRequestCount(count);
    try {
      await AsyncStorage.setItem(FRIEND_REQUEST_SEEN_COUNT_KEY, String(count));
    } catch {
      // ignore persistence failures
    }
  }, []);

  const formatPreviewText = (contact, waitingForApproval) => {
    if (waitingForApproval) {
      return '你已发出好友申请';
    }
    if (contact.last_message === '[voice]') {
      return '[语音]';
    }
    if (contact.last_message === '[image]') {
      return '[图片]';
    }
    if (contact.last_message === '[sticker]') {
      return '[\u8868\u60c5\u5305]';
    }
    return contact.last_message || '暂无消息';
  };

  const formatConversationTime = (timestamp) => {
    if (!timestamp) {
      return '';
    }
    const value = new Date(timestamp);
    if (Number.isNaN(value.getTime())) {
      return '';
    }
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const buildAvatarStyle = (name) => {
    const palette = [
      { backgroundColor: '#DFF2E1', color: '#276A3A' },
      { backgroundColor: '#DDEBFF', color: '#2753A6' },
      { backgroundColor: '#F8E2D1', color: '#8A4A14' },
      { backgroundColor: '#E9DFFC', color: '#6B3CC9' },
      { backgroundColor: '#F4E3BC', color: '#8A5A00' },
    ];
    const code = (name || '微').charCodeAt(0);
    return palette[code % palette.length];
  };

  const hasUnreadRequests = incomingRequests.length > seenRequestCount;
  const unreadRequestCount = hasUnreadRequests ? incomingRequests.length - seenRequestCount : 0;

  const filteredRequests = incomingRequests.filter((request) => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return true;
    }
    return `${request.requesterName || ''} ${request.requesterUserId || ''} ${request.targetUserId || ''}`.toLowerCase().includes(keyword);
  });

  const filteredContacts = contacts.filter((item) => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return true;
    }
    return `${item.name || ''} ${item.peerUserId || ''} ${item.last_message || ''}`.toLowerCase().includes(keyword);
  });

  const pairedContact = contacts.find((item) => item.syncState === 'matched') || contacts[0] || null;

  const directoryEntries = [
    {
      key: 'new-friends',
      title: '新朋友',
      subtitle: hasUnreadRequests ? `你有 ${unreadRequestCount} 条新的好友申请` : filteredRequests.length > 0 ? `待处理 ${filteredRequests.length} 条好友申请` : '查看新的好友申请',
      icon: 'person-add',
      iconColor: '#FFFFFF',
      iconBackground: '#07C160',
      badge: hasUnreadRequests ? unreadRequestCount : filteredRequests.length,
      onPress: () => {
        setActiveTab('contacts');
        setActivePanel('requests');
        markRequestsAsSeen(incomingRequests.length);
      },
    },
    {
      key: 'cloud-records',
      title: '云端记录',
      subtitle: '查看已同步的聊天记录与媒体',
      icon: 'cloud-outline',
      iconColor: '#FFFFFF',
      iconBackground: '#4B8BFF',
      badge: 0,
      onPress: () => onOpenCloud && onOpenCloud(),
    },
    {
      key: 'phone-settings',
      title: '修改手机号',
      subtitle: '手机号录错了或者换号时，在这里改成新的',
      icon: 'call-outline',
      iconColor: '#FFFFFF',
      iconBackground: '#07C160',
      badge: 0,
      onPress: () => onOpenPhoneSettings && onOpenPhoneSettings(),
    },
    {
      key: 'unlock-pin-settings',
      title: '修改进入密码',
      subtitle: '只修改这台手机从计算器进入聊天界面的密码',
      icon: 'key-outline',
      iconColor: '#FFFFFF',
      iconBackground: '#8B5CF6',
      badge: 0,
      onPress: () => onOpenUnlockPinSettings && onOpenUnlockPinSettings(),
    },
    {
      key: 'membership-center',
      title: '会员中心',
      subtitle: '首月19.9元/30天，首购赠7天',
      icon: 'card-outline',
      iconColor: '#FFFFFF',
      iconBackground: '#F59E0B',
      badge: 0,
      onPress: () => onOpenMembership && onOpenMembership(),
    },
    {
      key: 'ritual-center',
      title: '双人仪式',
      subtitle: pairedContact ? `记录和 ${pairedContact.name} 的关系时刻` : '先添加一位可信对象，建立双人关系记录',
      icon: 'heart-outline',
      iconColor: '#FFFFFF',
      iconBackground: '#F56C8D',
      badge: 0,
      onPress: () => pairedContact && onOpenRituals && onOpenRituals(pairedContact),
    },
  ];

  const requestScreenTitle = filteredRequests.length > 0 ? `新朋友 (${filteredRequests.length})` : '新朋友';

  const renderContact = ({ item, index }) => {
    const waitingForApproval = item.syncState === 'request_sent';
    const statusText = waitingForApproval ? '已发送' : '';
    const previewText = formatPreviewText(item, waitingForApproval);
    const conversationTime = formatConversationTime(item.updatedAt);
    const avatarStyle = buildAvatarStyle(item.name);

    return (
      <TouchableOpacity
        activeOpacity={0.82}
        style={[styles.contactItem, index === 0 && styles.firstContact]}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        onPress={() => navigation && navigation.navigate('ChatWindow', { contact: item })}
      >
        <View style={[styles.avatar, { backgroundColor: avatarStyle.backgroundColor }]}>
          <Text style={[styles.avatarText, { color: avatarStyle.color }]}>{item.name.slice(0, 1)}</Text>
        </View>
        <View style={styles.contactInfo}>
          <View style={styles.contactTop}>
            <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.contactMetaRight}>
              {conversationTime ? <Text style={styles.contactTime}>{conversationTime}</Text> : null}
              {statusText ? (
                <View style={[styles.statusPill, waitingForApproval && styles.statusPillPending]}>
                  <Text style={[styles.statusPillText, waitingForApproval && styles.statusPillTextPending]}>{statusText}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.contactBottom}>
            <Text style={styles.preview} numberOfLines={1}>{previewText}</Text>
            <Ionicons name="chevron-forward" size={15} color="#C9C9C9" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDirectoryEntry = ({ item, index }) => (
    <TouchableOpacity
      activeOpacity={0.82}
      style={[styles.directoryItem, index === 0 && styles.firstContact]}
      onPress={item.onPress}
    >
      <View style={[styles.directoryIcon, { backgroundColor: item.iconBackground }]}>
        <Ionicons name={item.icon} size={20} color={item.iconColor} />
      </View>
      <View style={styles.directoryInfo}>
        <Text style={styles.directoryTitle}>{item.title}</Text>
        <Text style={styles.directorySubtitle} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      {item.badge ? (
        <View style={styles.directoryBadge}>
          <Text style={styles.directoryBadgeText}>{item.badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color="#C9C9C9" />
    </TouchableOpacity>
  );

  const renderDirectoryContact = ({ item, index }) => {
    const avatarStyle = buildAvatarStyle(item.name);

    return (
      <TouchableOpacity
        activeOpacity={0.82}
        style={[styles.contactItem, index === 0 && styles.firstContact]}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        onPress={() => openConversation(item)}
      >
        <View style={[styles.avatar, { backgroundColor: avatarStyle.backgroundColor }]}>
          <Text style={[styles.avatarText, { color: avatarStyle.color }]}>{item.name.slice(0, 1)}</Text>
        </View>
        <View style={styles.contactInfo}>
          <View style={styles.contactTopSimple}>
            <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={15} color="#C9C9C9" />
          </View>
          <Text style={styles.directoryContactMeta} numberOfLines={1}>{item.syncState === 'matched' ? '已建立双向好友' : item.syncState === 'request_sent' ? '等待对方通过' : '本地联系人'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }] }>
      <StatusBar barStyle="dark-content" backgroundColor="#EDEDED" />
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          {activePanel === 'requests' ? (
            <TouchableOpacity style={styles.headerBackButton} onPress={() => setActivePanel('root')} accessibilityLabel="返回通讯录">
              <Ionicons name="chevron-back" size={22} color="#111111" />
            </TouchableOpacity>
          ) : null}
          <View>
            <Text style={styles.title}>{activePanel === 'requests' ? requestScreenTitle : activeTab === 'messages' ? '聊天' : '通讯录'}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={onLock}>
            <Ionicons name="calculator-outline" size={19} color="#111111" />
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel="打开添加朋友菜单" activeOpacity={0.75} style={styles.headerButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => setActionSheetVisible(true)}>
            <Ionicons name="add" size={23} color="#111111" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#8E8E93" />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索"
          placeholderTextColor="#8E8E93"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.75} style={styles.searchClearButton}>
            <Ionicons name="close-circle" size={16} color="#B5B5B5" />
          </TouchableOpacity>
        ) : null}
      </View>

      {activeTab === 'messages' ? (
        <>
          {filteredRequests.length > 0 && (
            <View style={styles.requestPanel}>
              <TouchableOpacity style={styles.requestHeader} activeOpacity={0.82} onPress={() => { setActiveTab('contacts'); setActivePanel('requests'); markRequestsAsSeen(incomingRequests.length); }}>
                <View>
                  <Text style={styles.requestTitle}>好友申请</Text>
                  <Text style={styles.requestSubtitle}>{hasUnreadRequests ? `你有 ${unreadRequestCount} 条新的好友申请` : '等待你处理'}</Text>
                </View>
                {hasUnreadRequests ? <View style={styles.requestHeaderBadge}><Text style={styles.requestHeaderBadgeText}>{unreadRequestCount}</Text></View> : null}
              </TouchableOpacity>
              {filteredRequests.map((request) => (
                <View key={request.id} style={styles.requestItem}>
                  <View style={styles.requestBadge}>
                    <Ionicons name={request.channel === 'qr' ? 'qr-code-outline' : 'call-outline'} size={20} color="#07C160" />
                  </View>
                  <View style={styles.requestInfo}>
                    <View style={styles.requestNameRow}>
                      <Text style={styles.requestName}>{request.requesterName}</Text>
                      <Text style={styles.requestTag}>{'手机号添加'}</Text>
                    </View>
                    <Text style={styles.requestMeta} numberOfLines={1}>对方通过手机号搜索向你发来申请</Text>
                  </View>
                  <TouchableOpacity style={styles.requestAcceptButton} onPress={() => handleAcceptRequest(request.id)} activeOpacity={0.82}>
                    <Text style={styles.requestAcceptText}>接受</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <FlatList
            data={filteredContacts}
            renderItem={renderContact}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name={searchText ? 'search-outline' : 'chatbubble-ellipses-outline'} size={30} color="#07C160" />
                </View>
                <Text style={styles.emptyTitle}>{searchText ? '没有找到相关聊天' : '暂无联系人'}</Text>
                <Text style={styles.emptyHint}>{searchText ? '换个名字或消息关键词再试试' : '点击右上角，通过手机号搜索并添加好友'}</Text>
              </View>
            }
          />
        </>
      ) : activePanel === 'requests' ? (
        <FlatList
          data={filteredRequests}
          renderItem={({ item }) => (
            <View style={styles.requestItemScreen}>
              <View style={styles.requestBadge}>
                <Ionicons name={item.channel === 'qr' ? 'qr-code-outline' : 'call-outline'} size={20} color="#07C160" />
              </View>
              <View style={styles.requestInfo}>
                <View style={styles.requestNameRow}>
                  <Text style={styles.requestName}>{item.requesterName}</Text>
                  <Text style={styles.requestTag}>手机号添加</Text>
                </View>
                <Text style={styles.requestMeta} numberOfLines={1}>对方通过手机号搜索向你发来申请</Text>
              </View>
              <TouchableOpacity style={styles.requestAcceptButton} onPress={() => handleAcceptRequest(item.id)} activeOpacity={0.82}>
                <Text style={styles.requestAcceptText}>接受</Text>
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={(item) => `request-screen-${item.id}`}
          contentContainerStyle={styles.requestScreenContent}
          onLayout={() => {
            if (incomingRequests.length > 0) {
              markRequestsAsSeen(incomingRequests.length);
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name={searchText ? 'search-outline' : 'person-add-outline'} size={30} color="#07C160" />
              </View>
              <Text style={styles.emptyTitle}>{searchText ? '没有找到相关申请' : '还没有新的好友申请'}</Text>
              <Text style={styles.emptyHint}>{searchText ? '换个名字再试试' : '对方发来好友申请后，会先出现在这里'}</Text>
            </View>
          }
        />
      ) : (
        <>
          <FlatList
            data={directoryEntries}
            renderItem={renderDirectoryEntry}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.directorySection}
            ListFooterComponent={
              <View style={styles.directoryContactsSection}>
                <Text style={styles.directorySectionTitle}>联系人</Text>
                <FlatList
                  data={filteredContacts}
                  renderItem={renderDirectoryContact}
                  keyExtractor={(item) => `directory-${item.id}`}
                  scrollEnabled={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <View style={styles.emptyIconWrap}>
                        <Ionicons name={searchText ? 'search-outline' : 'people-outline'} size={30} color="#07C160" />
                      </View>
                      <Text style={styles.emptyTitle}>{searchText ? '没有找到相关联系人' : '通讯录还是空的'}</Text>
                      <Text style={styles.emptyHint}>{searchText ? '换个名字再试试' : '先去消息页添加朋友，之后会出现在这里'}</Text>
                    </View>
                  }
                />
              </View>
            }
          />
        </>
      )}

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.85} onPress={() => { setActiveTab('messages'); setActivePanel('root'); }}>
          <View style={styles.tabInner}>
            <Ionicons name={activeTab === 'messages' ? 'chatbubble' : 'chatbubble-outline'} size={22} color={activeTab === 'messages' ? '#07C160' : '#8E8E93'} />
            <Text style={activeTab === 'messages' ? styles.tabText : styles.tabTextMuted}>消息</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.85} onPress={() => { setActiveTab('contacts'); setActivePanel('root'); }}>
          <View style={styles.tabInner}>
            <Ionicons name={activeTab === 'contacts' ? 'people' : 'people-outline'} size={22} color={activeTab === 'contacts' ? '#07C160' : '#8E8E93'} />
            <Text style={activeTab === 'contacts' ? styles.tabText : styles.tabTextMuted}>通讯录</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={onLock} activeOpacity={0.85}>
          <View style={styles.tabInner}>
            <Ionicons name="calculator-outline" size={22} color="#8E8E93" />
            <Text style={styles.tabTextMuted}>伪装</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => { resetAddFriendState(); setModalVisible(false); }}>
        <KeyboardAvoidingView style={styles.modalOverlay} contentContainerStyle={styles.centerModalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>手机号添加</Text>
            <Text style={styles.modalHint}>先输入对方手机号搜索，确认昵称后再发送好友申请。</Text>
            <TextInput style={styles.input} placeholder="对方手机号" placeholderTextColor="#6E7782" value={phoneInput} onChangeText={setPhoneInput} keyboardType="phone-pad" />
            <TouchableOpacity style={styles.lookupButton} onPress={handleLookupPhone} activeOpacity={0.82}>
              <Text style={styles.lookupButtonText}>{lookupLoading ? '搜索中...' : '搜索手机号'}</Text>
            </TouchableOpacity>
            {phoneLookupResult ? (
              <View style={styles.lookupResultCard}>
                <Text style={styles.lookupResultTitle}>搜索结果</Text>
                <Text style={styles.lookupResultName}>{phoneLookupResult.nickname}</Text>
                <Text style={styles.lookupResultHint}>确认无误后发送好友申请，对方不会看到你的备注。</Text>
              </View>
            ) : null}
            <TextInput style={styles.input} placeholder="备注名（可修改）" placeholderTextColor="#6E7782" value={newName} onChangeText={setNewName} />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => { resetAddFriendState(); setModalVisible(false); }}>
                <Text style={styles.cancelButtonText}>取消</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.addButton]} onPress={handleAddContact}>
                <Text style={styles.addButtonText}>发送申请</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={actionSheetVisible} transparent={true} animationType="fade" onRequestClose={() => setActionSheetVisible(false)}>
        <TouchableOpacity style={styles.actionSheetOverlay} activeOpacity={1} onPress={() => setActionSheetVisible(false)}>
          <View style={styles.actionSheetContent}>
            <TouchableOpacity accessibilityLabel="打开手机号添加" style={styles.actionSheetItem} onPress={() => { setActionSheetVisible(false); setModalVisible(true); }}>
              <View style={styles.actionSheetIconBg}><Ionicons name="call-outline" size={20} color="#07C160" /></View>
              <View style={styles.actionSheetTextWrap}>
                <Text style={styles.actionSheetItemText}>手机号添加</Text>
                <Text style={styles.actionSheetItemSubtext}>搜索手机号，确认昵称后发送好友申请</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { setActionSheetVisible(false); onOpenCloud && onOpenCloud(); }}>
              <View style={styles.actionSheetIconBg}><Ionicons name="cloud-outline" size={20} color="#07C160" /></View>
              <View style={styles.actionSheetTextWrap}>
                <Text style={styles.actionSheetItemText}>云端记录</Text>
                <Text style={styles.actionSheetItemSubtext}>查看已同步的聊天记录与媒体</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.lockButtonAction} onPress={onLock}>
              <View style={styles.actionSheetIconBg}><Ionicons name="lock-closed-outline" size={20} color="#07C160" /></View>
              <View style={styles.actionSheetTextWrap}>
                <Text style={styles.actionSheetItemText}>立即锁定</Text>
                <Text style={styles.actionSheetItemSubtext}>隐藏当前会话入口并返回首页</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetCancel} onPress={() => setActionSheetVisible(false)}>
              <Text style={styles.actionSheetCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDEDED' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#F6F6F6',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerBackButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 4, marginLeft: -6 },
  title: { color: '#111111', fontSize: 22, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    marginHorizontal: 14,
    marginBottom: 10,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  searchInput: { flex: 1, marginLeft: 6, color: '#111111', fontSize: 15, paddingVertical: 0 },
  searchClearButton: { marginLeft: 6, minWidth: 24, minHeight: 24, justifyContent: 'center', alignItems: 'center' },
  requestPanel: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EFEFEF', paddingTop: 10, paddingBottom: 4 },
  requestHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10 },
  requestTitle: { color: '#111111', fontSize: 15, fontWeight: '600' },
  requestSubtitle: { color: '#8A8A8A', fontSize: 12, marginTop: 2 },
  requestHeaderBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FA5151',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  requestHeaderBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  requestItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 12 },
  requestScreenContent: { flexGrow: 1, backgroundColor: '#FFFFFF', paddingTop: 8, paddingBottom: 88 },
  requestItemScreen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F1F1', backgroundColor: '#FFFFFF' },
  requestBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1FBF5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  requestInfo: { flex: 1, paddingRight: 12 },
  requestNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  requestName: { color: '#111111', fontSize: 16, fontWeight: '500', marginRight: 8 },
  requestTag: { color: '#07C160', fontSize: 11, fontWeight: '600' },
  requestMeta: { color: '#8A8A8A', fontSize: 13 },
  requestAcceptButton: { minWidth: 68, minHeight: 36, borderRadius: 18, backgroundColor: '#95EC69', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14 },
  requestAcceptText: { color: '#1E320E', fontSize: 13, fontWeight: '600' },
  listContent: { flexGrow: 1, paddingBottom: 104, backgroundColor: '#FFFFFF' },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  firstContact: { borderTopWidth: 0 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 19, fontWeight: '700' },
  contactInfo: { flex: 1 },
  contactTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  contactName: { color: '#111111', fontSize: 17, fontWeight: '500', flex: 1, paddingRight: 10 },
  contactMetaRight: { alignItems: 'flex-end', minWidth: 58 },
  contactTime: { color: '#B0B0B0', fontSize: 11, marginBottom: 6 },
  statusPill: {
    minHeight: 22,
    borderRadius: 11,
    backgroundColor: '#F1F1F1',
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPillPending: { backgroundColor: '#EAF9F0' },
  statusPillText: { color: '#8A8A8A', fontSize: 11, fontWeight: '600' },
  statusPillTextPending: { color: '#07C160' },
  contactBottom: { flexDirection: 'row', alignItems: 'center' },
  preview: { flex: 1, color: '#8C8C8C', fontSize: 14, paddingRight: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120, backgroundColor: '#FFFFFF', paddingHorizontal: 24 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#F1FBF5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { color: '#111111', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyHint: { color: '#8A8A8A', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  directoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  directoryIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  directoryInfo: { flex: 1, paddingRight: 10 },
  directoryTitle: { color: '#111111', fontSize: 17, fontWeight: '500', marginBottom: 4 },
  directorySubtitle: { color: '#8A8A8A', fontSize: 13 },
  directoryBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FA5151',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  directoryBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  directorySection: { paddingBottom: 104, backgroundColor: '#F6F6F6' },
  directoryContactsSection: { marginTop: 10, backgroundColor: '#FFFFFF' },
  directorySectionTitle: { color: '#8A8A8A', fontSize: 12, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, backgroundColor: '#F6F6F6' },
  contactTopSimple: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  directoryContactMeta: { color: '#8C8C8C', fontSize: 14, paddingRight: 8 },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: '#F7F7F7',
    borderTopWidth: 1,
    borderTopColor: '#D9D9D9',
    paddingTop: 7,
    paddingBottom: 10,
  },
  tabItem: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  tabInner: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  tabText: { color: '#07C160', fontSize: 12, fontWeight: '500', marginTop: 3 },
  tabTextMuted: { color: '#8E8E93', fontSize: 12, fontWeight: '500', marginTop: 3 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerModalContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  modalTitle: { color: '#111111', fontSize: 20, fontWeight: '600', marginBottom: 8 },
  modalHint: { color: '#7D7D7D', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  input: { backgroundColor: '#FFFFFF', color: '#111111', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#DDDDDD' },
  lookupButton: { minHeight: 44, borderRadius: 10, backgroundColor: '#F1FBF5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  lookupButtonText: { color: '#07C160', fontSize: 15, fontWeight: '600' },
  lookupResultCard: { backgroundColor: '#F7F7F7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  lookupResultTitle: { color: '#8A8A8A', fontSize: 12, marginBottom: 6 },
  lookupResultName: { color: '#111111', fontSize: 17, fontWeight: '600', marginBottom: 4 },
  lookupResultHint: { color: '#6E7782', fontSize: 13, lineHeight: 18 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, gap: 10 },
  modalButton: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: '#F2F2F2' },
  addButton: { backgroundColor: '#07C160' },
  cancelButtonText: { color: '#666666', fontSize: 15, fontWeight: '500' },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  actionSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.24)', justifyContent: 'flex-end' },
  actionSheetContent: { backgroundColor: '#F7F7F7', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 24, paddingTop: 10 },
  actionSheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 18, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  actionSheetIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EAF9F0', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  actionSheetTextWrap: { flex: 1 },
  actionSheetItemText: { color: '#111111', fontSize: 16, fontWeight: '500', marginBottom: 3 },
  actionSheetItemSubtext: { color: '#8A8A8A', fontSize: 12, lineHeight: 16 },
  lockButtonAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 18, backgroundColor: '#FFFFFF' },
  actionSheetCancel: { marginTop: 8, paddingVertical: 16, alignItems: 'center', backgroundColor: '#FFFFFF' },
  actionSheetCancelText: { color: '#111111', fontSize: 16, fontWeight: '500' },
  qrModalContent: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24, width: '84%', maxWidth: 340, alignItems: 'center' },
  closeButton: { position: 'absolute', top: 12, right: 14, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  closeButtonText: { color: '#666666', fontSize: 20 },
});
