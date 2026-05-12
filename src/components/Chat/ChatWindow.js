import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import MessageBubble from './MessageBubble';
import BurnModal from './BurnModal';
import StickerPickerModal from './StickerPickerModal';
import { listConversationMessages, removeConversationMessage, sendConversationMessage } from '../../services/ChatRepository';
import { destroyExpiredMessages, BURN_OPTIONS } from '../../services/MessageService';
import { syncMessageToCloud } from '../../services/CloudService';

export default function ChatWindow({ route, onBack, onLock }) {
  const { contact } = route.params;
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [messageAction, setMessageAction] = useState(null);
  const [showBurnModal, setShowBurnModal] = useState(false);
  const [burnOption, setBurnOption] = useState(null);
  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recordingTimer = useRef(null);
  const recordingRef = useRef(null);
  const recordingStartedAt = useRef(0);
  const voicePressActive = useRef(false);
  const sound = useRef(new Audio.Sound());
  const [showMore, setShowMore] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const loaded = await listConversationMessages(contact.id);
      setMessages(loaded);
    } catch (error) {
      Alert.alert('连接失败', error.message || '无法加载聊天记录');
    }
  }, [contact.id]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(async () => {
      try {
        const active = await destroyExpiredMessages(contact.id);
        if (active) setMessages(active);
      } catch {
        // ignore background cleanup failures
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [contact.id, loadMessages]);

  useEffect(() => () => {
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
    }
    sound.current.unloadAsync().catch(() => {});
  }, []);

  const syncSavedMessageToCloud = async (saved) => {
    try {
      await syncMessageToCloud(saved);
    } catch (error) {
      Alert.alert('云端保存失败', error.message || '无法保存到云端');
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    setShowMore(false);
    setShowStickerPicker(false);
    const msg = { text: inputText.trim(), type: 'text', isMe: true };
    if (burnOption) {
      msg.burnAfterRead = true;
      msg.burnDuration = BURN_OPTIONS[burnOption];
      msg.readAt = null;
    }
    try {
      const saved = await sendConversationMessage(contact, msg);
      setMessages(prev => [...prev, saved]);
      setInputText('');
      await syncSavedMessageToCloud(saved);
    } catch (error) {
      Alert.alert('发送失败', error.message || '无法保存消息到本地服务器');
    }
  };

  const handleSelectImage = async () => {
    try {
      setShowMore(false);
      setShowStickerPicker(false);
      const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!p.granted) { Alert.alert('权限不足', '请在设置中开启相册权限'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (!r.canceled && r.assets[0]) {
        const msg = { uri: r.assets[0].uri, type: 'image', isMe: true };
        if (burnOption) { msg.burnAfterRead = true; msg.burnDuration = BURN_OPTIONS[burnOption]; }
        const saved = await sendConversationMessage(contact, msg);
        setMessages(prev => [...prev, saved]);
        await syncSavedMessageToCloud(saved);
      }
    } catch (error) {
      Alert.alert('发送失败', error.message || '无法保存图片到本地服务器');
    }
  };

  const handleTakePhoto = async () => {
    try {
      setShowMore(false);
      setShowStickerPicker(false);
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) { Alert.alert('权限不足', '请在设置中开启相机权限'); return; }
      const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!r.canceled && r.assets[0]) {
        const msg = { uri: r.assets[0].uri, type: 'image', isMe: true };
        if (burnOption) { msg.burnAfterRead = true; msg.burnDuration = BURN_OPTIONS[burnOption]; }
        const saved = await sendConversationMessage(contact, msg);
        setMessages(prev => [...prev, saved]);
        await syncSavedMessageToCloud(saved);
      }
    } catch (error) {
      Alert.alert('发送失败', error.message || '无法保存图片到本地服务器');
    }
  };

  const startRecording = async () => {
    if (recordingRef.current || isRecording) {
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('录音失败', '请允许麦克风权限后再试');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecording: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      recordingStartedAt.current = Date.now();
      setRecording(recording);
      setRecordingDuration(0);
      setIsRecording(true);
      setShowMore(false);
      setShowStickerPicker(false);
      recordingTimer.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
      if (!voicePressActive.current) {
        stopRecording();
      }
    } catch (error) {
      recordingRef.current = null;
      recordingStartedAt.current = 0;
      setRecording(null);
      setIsRecording(false);
      Alert.alert('录音失败', error.message || '无法启动录音');
    }
  };

  const stopRecording = async () => {
    const activeRecording = recordingRef.current;
    if (!activeRecording) return;
    try {
      clearInterval(recordingTimer.current);
      setIsRecording(false);
      recordingRef.current = null;
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - recordingStartedAt.current) / 1000));
      setRecording(null);
      setRecordingDuration(0);
      recordingStartedAt.current = 0;
      if (uri) {
        const msg = { uri, type: 'voice', duration: elapsedSeconds, isMe: true };
        if (burnOption) { msg.burnAfterRead = true; msg.burnDuration = BURN_OPTIONS[burnOption]; }
        const saved = await sendConversationMessage(contact, msg);
        setMessages(prev => [...prev, saved]);
        await syncSavedMessageToCloud(saved);
      }
    } catch (error) {
      recordingRef.current = null;
      recordingStartedAt.current = 0;
      setRecording(null);
      setRecordingDuration(0);
      setIsRecording(false);
      Alert.alert('发送失败', error.message || '无法保存语音到本地服务器');
    }
  };

  const cancelRecording = async () => {
    const activeRecording = recordingRef.current;
    if (!activeRecording) return;
    try {
      clearInterval(recordingTimer.current);
      setIsRecording(false);
      recordingRef.current = null;
      recordingStartedAt.current = 0;
      await activeRecording.stopAndUnloadAsync();
      setRecording(null);
      setRecordingDuration(0);
    } catch {
      recordingRef.current = null;
      recordingStartedAt.current = 0;
      setRecording(null);
      setRecordingDuration(0);
      setIsRecording(false);
    }
  };

  const handleVoicePressIn = async () => {
    if (!voiceMode || recording || isRecording) {
      return;
    }
    voicePressActive.current = true;
    await startRecording();
  };

  const handleVoicePressOut = () => {
    voicePressActive.current = false;
    if (voiceMode && recordingRef.current) {
      stopRecording();
    }
  };

  const handleLongPress = (msg) => setMessageAction(msg);

  const handleDeleteMsg = async () => {
    try {
      if (messageAction) {
        await removeConversationMessage(messageAction.id);
        await loadMessages();
      }
      setMessageAction(null);
    } catch (error) {
      Alert.alert('删除失败', error.message || '无法删除消息');
      setMessageAction(null);
    }
  };

  const renderMsg = ({ item }) => (
    <TouchableOpacity onLongPress={() => handleLongPress(item)} delayLongPress={500}>
      <MessageBubble message={item} isMe={item.isMe} />
    </TouchableOpacity>
  );

  const handleSelectSticker = async (sticker) => {
    if (!sticker) {
      return;
    }

    try {
      setShowStickerPicker(false);
      setShowMore(false);
      const msg = {
        content: sticker.id,
        stickerId: sticker.id,
        type: 'sticker',
        isMe: true,
      };
      if (burnOption) {
        msg.burnAfterRead = true;
        msg.burnDuration = BURN_OPTIONS[burnOption];
      }
      const saved = await sendConversationMessage(contact, msg);
      setMessages(prev => [...prev, saved]);
      await syncSavedMessageToCloud(saved);
    } catch (error) {
      Alert.alert('发送失败', error.message || '无法保存表情包到本地服务器');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 20) }]}>
        <TouchableOpacity style={styles.headerIconButton} onPress={onBack} accessibilityLabel="返回会话列表">
          <Ionicons name="chevron-back" size={24} color="#111111" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.name} numberOfLines={1}>{contact.name}</Text>
          <Text style={styles.subline}>{contact.syncState === 'request_sent' ? '等待对方通过好友申请' : '本地私密 · 仅此设备'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconButton} onPress={onLock} accessibilityLabel="锁定应用">
            <Ionicons name="lock-closed-outline" size={19} color="#111111" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerIconButton, burnOption && styles.burnButtonActive]} onPress={() => setShowBurnModal(true)} accessibilityLabel="打开阅后即焚设置">
            <Ionicons name={burnOption ? 'flame' : 'ellipsis-horizontal'} size={18} color={burnOption ? '#2B4A0E' : '#111111'} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList data={[...messages].reverse()} renderItem={renderMsg} keyExtractor={item => String(item.id)} contentContainerStyle={styles.list} inverted />

      {recording ? (
        <View style={[styles.recBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TouchableOpacity style={styles.recordActionButton} onPress={cancelRecording}><Text style={styles.recordActionText}>取消</Text></TouchableOpacity>
          <View style={styles.recCenter}>
            <Text style={styles.recDot}>●</Text>
            <Text style={styles.recHint}>正在录音，松开发送</Text>
            <Text style={styles.recTime}>{Math.floor(recordingDuration/60)}:{String(recordingDuration%60).padStart(2,'0')}</Text>
          </View>
          <TouchableOpacity style={[styles.recordActionButton, styles.recordSendButton]} onPress={stopRecording}><Text style={styles.recordSendText}>发送</Text></TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TouchableOpacity
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => {
              setShowStickerPicker(false);
              setShowMore(false);
              setVoiceMode((current) => {
                const next = !current;
                if (next) {
                  setInputText('');
                }
                return next;
              });
            }}
            accessibilityLabel={voiceMode ? '切回键盘输入' : '切换按住说话'}
          >
            <Ionicons name={voiceMode ? 'keypad-outline' : 'mic-outline'} size={20} color="#666666" />
          </TouchableOpacity>
          <View style={styles.inputWrap}>
            {voiceMode ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPressIn={handleVoicePressIn}
                onPressOut={handleVoicePressOut}
                style={[styles.voicePressArea, isRecording && styles.voicePressAreaActive]}
              >
                <Text style={[styles.voicePressText, isRecording && styles.voicePressTextActive]}>{isRecording ? '松开发送' : '按住 说话'}</Text>
              </TouchableOpacity>
            ) : (
              <TextInput
                style={styles.input}
                placeholder="输入消息"
                placeholderTextColor="#9A9A9A"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
            )}
          </View>
          {!voiceMode ? (
            <>
              {inputText.trim() ? (
                <TouchableOpacity style={styles.sendBtn} onPress={handleSend}><Text style={styles.sendText}>发送</Text></TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.plusBtn} onPress={() => { setShowStickerPicker(false); setShowMore((current) => !current); }} accessibilityLabel="打开更多功能">
                <Ionicons name={showMore ? 'close-outline' : 'add'} size={20} color="#666666" />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      )}

      {showMore && (
        <View style={[styles.morePanel, { paddingBottom: insets.bottom + 22 }]}>
          <View style={styles.moreRow}>
            <TouchableOpacity style={styles.moreItem} onPress={handleSelectImage} accessibilityLabel="从相册选择图片">
              <View style={styles.moreIcon}><Ionicons name="images-outline" size={26} color="#585858" /></View>
              <Text style={styles.moreLabel}>相册</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreItem} onPress={handleTakePhoto} accessibilityLabel="打开拍照发送图片">
              <View style={styles.moreIcon}><Ionicons name="camera-outline" size={26} color="#585858" /></View>
              <Text style={styles.moreLabel}>拍照</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreItem} onPress={() => { setShowMore(false); setShowStickerPicker(true); }} accessibilityLabel="打开表情包选择">
              <View style={styles.moreIcon}><Ionicons name="happy-outline" size={26} color="#585858" /></View>
              <Text style={styles.moreLabel}>表情包</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <StickerPickerModal visible={showStickerPicker} onClose={() => setShowStickerPicker(false)} onSelect={handleSelectSticker} />

      {messageAction && (
        <TouchableOpacity style={styles.actionOverlay} activeOpacity={1} onPress={() => setMessageAction(null)}>
          <View style={[styles.actionSheet, { marginBottom: insets.bottom + 24 }]}>
            <TouchableOpacity style={styles.actionItem} onPress={handleDeleteMsg}><Text style={styles.actionTextDanger}>删除消息</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionCancel} onPress={() => setMessageAction(null)}><Text style={styles.cancelText}>取消</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <BurnModal visible={showBurnModal} current={burnOption} onSelect={(opt) => { setBurnOption(opt); setShowBurnModal(false); }} onCancel={() => setShowBurnModal(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDEDED' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingTop: 12, paddingBottom: 11, backgroundColor: '#F6F6F6', borderBottomWidth: 1, borderBottomColor: '#D8D8D8' },
  headerIconButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { color: '#111111', fontSize: 17, fontWeight: '600', maxWidth: '100%' },
  subline: { color: '#8C8C8C', fontSize: 11, marginTop: 2 },
  burnButtonActive: { backgroundColor: '#DFF5D1' },
  list: { flexGrow: 1, paddingVertical: 10, backgroundColor: '#EDEDED' },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 7, paddingBottom: 8, backgroundColor: '#F7F7F7', borderTopWidth: 1, borderTopColor: '#D8D8D8' },
  iconButton: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  inputWrap: { flex: 1, height: 38, backgroundColor: '#FFFFFF', borderRadius: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#D7D7D7', justifyContent: 'center' },
  input: { color: '#111111', fontSize: 16, maxHeight: 80, paddingVertical: 0, paddingHorizontal: 0, lineHeight: 20 },
  voicePressArea: { flex: 1, height: '100%', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  voicePressAreaActive: { backgroundColor: '#F1F1F1' },
  voicePressText: { color: '#333333', fontSize: 15, fontWeight: '500' },
  voicePressTextActive: { color: '#111111' },
  sendBtn: { minWidth: 60, height: 36, borderRadius: 6, backgroundColor: '#95EC69', justifyContent: 'center', alignItems: 'center', marginLeft: 8, paddingHorizontal: 12 },
  sendText: { color: '#20330F', fontSize: 14, fontWeight: '600' },
  plusBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  recBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F7F7F7', borderTopWidth: 1, borderTopColor: '#D8D8D8' },
  recordActionButton: { minWidth: 58, height: 34, borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7D7D7' },
  recordActionText: { color: '#4A4A4A', fontSize: 13, fontWeight: '500' },
  recordSendButton: { backgroundColor: '#95EC69', borderColor: '#95EC69' },
  recordSendText: { color: '#20330F', fontSize: 13, fontWeight: '600' },
  recCenter: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  recDot: { color: '#E24C4B', fontSize: 12, marginRight: 6 },
  recHint: { color: '#6A6A6A', fontSize: 13, marginRight: 10 },
  recTime: { color: '#111111', fontSize: 15, fontWeight: '600' },
  morePanel: { backgroundColor: '#F7F7F7', borderTopWidth: 1, borderTopColor: '#D8D8D8', paddingTop: 18, paddingBottom: 22, paddingHorizontal: 18 },
  moreRow: { flexDirection: 'row', gap: 24 },
  moreItem: { alignItems: 'center', width: 72 },
  moreIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#E3E3E3' },
  moreLabel: { color: '#666666', fontSize: 12, lineHeight: 16 },
  actionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'flex-end', alignItems: 'center' },
  actionSheet: { backgroundColor: '#F7F7F7', borderRadius: 14, marginBottom: 88, width: '82%', overflow: 'hidden' },
  actionItem: { paddingVertical: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E3E3E3', backgroundColor: '#FFFFFF' },
  actionText: { color: '#111111', fontSize: 16, fontWeight: '500' },
  actionTextDanger: { color: '#E24C4B', fontSize: 16, fontWeight: '500' },
  actionCancel: { paddingVertical: 16, alignItems: 'center', backgroundColor: '#FFFFFF', marginTop: 8 },
  cancelText: { color: '#111111', fontSize: 16, fontWeight: '500' },
});
