import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import MessageBubble from './MessageBubble';
import CloudBackupModal from './CloudBackupModal';
import BurnModal from './BurnModal';
import { getMessages, saveMessage } from '../../services/StorageService';
import { deleteMessage, destroyExpiredMessages, BURN_OPTIONS } from '../../services/MessageService';
import { uploadToCloud } from '../../services/CloudService';

const BURN_LABELS = { '1分钟': '60秒', '5分钟': '5分钟', '30分钟': '30分钟', '1小时': '1小时' };

export default function ChatWindow({ route, onBack }) {
  const { contact } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [messageAction, setMessageAction] = useState(null);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showBurnModal, setShowBurnModal] = useState(false);
  const [burnOption, setBurnOption] = useState(null);
  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recordingTimer = useRef(null);
  const sound = useRef(new Audio.Sound());
  const [showMore, setShowMore] = useState(false);

  const loadMessages = useCallback(async () => {
    const loaded = await getMessages(contact.id);
    setMessages(loaded);
  }, [contact.id]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(async () => {
      const active = await destroyExpiredMessages(contact.id);
      setMessages(active);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadMessages, contact.id]);

  useEffect(() => {
    return () => {
      if (recording) recording.stopAndUnloadAsync();
      sound.current.unloadAsync();
    };
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const msg = { text: inputText.trim(), isMe: true };
    if (burnOption) {
      msg.burnAfterRead = true;
      msg.burnDuration = BURN_OPTIONS[burnOption];
      msg.readAt = null;
    }
    await saveMessage(contact.id, msg);
    setMessages(prev => [...prev, { ...msg, id: Date.now(), timestamp: Date.now() }]);
    setInputText('');
  };

  const handleSelectImage = async () => {
    setShowMore(false);
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) { Alert.alert('权限不足', '请在设置中开启相册权限'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!r.canceled && r.assets[0]) {
      const msg = { uri: r.assets[0].uri, type: 'image', isMe: true };
      if (burnOption) { msg.burnAfterRead = true; msg.burnDuration = BURN_OPTIONS[burnOption]; }
      await saveMessage(contact.id, msg);
      setMessages(prev => [...prev, { ...msg, id: Date.now(), timestamp: Date.now() }]);
    }
  };

  const handleTakePhoto = async () => {
    setShowMore(false);
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) { Alert.alert('权限不足', '请在设置中开启相机权限'); return; }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!r.canceled && r.assets[0]) {
      const msg = { uri: r.assets[0].uri, type: 'image', isMe: true };
      if (burnOption) { msg.burnAfterRead = true; msg.burnDuration = BURN_OPTIONS[burnOption]; }
      await saveMessage(contact.id, msg);
      setMessages(prev => [...prev, { ...msg, id: Date.now(), timestamp: Date.now() }]);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecording: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setRecordingDuration(0);
      setIsRecording(true);
      recordingTimer.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch (err) { Alert.alert('录音失败', '无法启动录音'); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    clearInterval(recordingTimer.current);
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setRecordingDuration(0);
    if (uri && recordingDuration > 0) {
      const msg = { uri, type: 'voice', duration: recordingDuration, isMe: true };
      if (burnOption) { msg.burnAfterRead = true; msg.burnDuration = BURN_OPTIONS[burnOption]; }
      await saveMessage(contact.id, msg);
      setMessages(prev => [...prev, { ...msg, id: Date.now(), timestamp: Date.now() }]);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    clearInterval(recordingTimer.current);
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    setRecording(null);
    setRecordingDuration(0);
  };

  const handleLongPressIn = () => { setTimeout(() => startRecording(), 200); };
  const handleLongPressOut = () => { if (isRecording && recording) stopRecording(); };
  const handleLongPressCancel = () => { cancelRecording(); };

  const handleLongPress = (msg) => setMessageAction(msg);

  const handleCloudBackup = () => { setShowCloudModal(true); setMessageAction(null); };
  const handleUploadConfirm = async () => {
    if (messageAction) { await uploadToCloud(messageAction); Alert.alert('成功', '已加密上传到云端，可在"云端记录"中查看'); }
    setShowCloudModal(false);
    setMessageAction(null);
  };
  const handleDeleteMsg = async () => {
    if (messageAction) { await deleteMessage(contact.id, messageAction.id); setMessages(prev => prev.filter(m => m.id !== messageAction.id)); }
    setMessageAction(null);
  };

  const renderMsg = ({ item }) => (
    <TouchableOpacity onLongPress={() => handleLongPress(item)} delayLongPress={500}>
      <MessageBubble message={item} isMe={item.isMe} />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.name}>{contact.name}</Text>
        <TouchableOpacity onPress={() => setShowBurnModal(true)}>
          <Text style={[styles.burnBtn, burnOption && styles.burnBtnActive]}>🔥</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={[...messages].reverse()} renderItem={renderMsg} keyExtractor={item => String(item.id)} contentContainerStyle={styles.list} inverted />

      {recording ? (
        <View style={styles.recBar}>
          <TouchableOpacity onPress={cancelRecording}><Text style={styles.cancel}>取消</Text></TouchableOpacity>
          <View style={styles.recCenter}><Text style={styles.recDot}>●</Text><Text style={styles.recTime}>{Math.floor(recordingDuration/60)}:{String(recordingDuration%60).padStart(2,'0')}</Text></View>
          <TouchableOpacity onPress={stopRecording}><Text style={styles.recSend}>发送</Text></TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.voiceBtn} onPressIn={handleLongPressIn} onPressOut={handleLongPressOut} onLongPress={handleLongPressCancel}>
            <Text style={styles.voiceText}>{inputText ? '取消' : '按住说话'}</Text>
          </TouchableOpacity>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} placeholder=" " placeholderTextColor="rgba(0,0,0,0)" value={inputText} onChangeText={setInputText} multiline />
          </View>
          {inputText.trim() ? (
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}><Text style={styles.sendText}>发送</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.plusBtn} onPress={() => setShowMore(!showMore)}><Text style={styles.plusText}>+</Text></TouchableOpacity>
          )}
        </View>
      )}

      {showMore && (
        <View style={styles.morePanel}>
          <View style={styles.moreRow}>
            <TouchableOpacity style={styles.moreItem} onPress={handleSelectImage}>
              <View style={styles.moreIcon}><Text>🖼️</Text></View>
              <Text style={styles.moreLabel}>相册</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreItem} onPress={handleTakePhoto}>
              <View style={styles.moreIcon}><Text>📷</Text></View>
              <Text style={styles.moreLabel}>拍照</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {messageAction && (
        <TouchableOpacity style={styles.actionOverlay} activeOpacity={1} onPress={() => setMessageAction(null)}>
          <View style={styles.actionSheet}>
            <TouchableOpacity style={styles.actionItem} onPress={handleCloudBackup}><Text style={styles.actionText}>☁️ 上云备份</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={handleDeleteMsg}><Text style={styles.actionText}>🗑️ 删除</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionCancel} onPress={() => setMessageAction(null)}><Text style={styles.cancelText}>取消</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <CloudBackupModal visible={showCloudModal} onUpload={handleUploadConfirm} onCancel={() => { setShowCloudModal(false); setMessageAction(null); }} />
      <BurnModal visible={showBurnModal} current={burnOption} onSelect={(opt) => { setBurnOption(opt); setShowBurnModal(false); }} onCancel={() => setShowBurnModal(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDEDED' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F7F7F7', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  back: { color: '#07C160', fontSize: 36, fontWeight: '300' },
  name: { color: '#333', fontSize: 18, fontWeight: '600' },
  burnBtn: { fontSize: 22 },
  burnBtnActive: { color: '#ff6b35' },
  list: { flexGrow: 1, paddingVertical: 10, backgroundColor: '#EDEDED' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#F7F7F7', borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  voiceBtn: { width: 72, height: 36, borderRadius: 6, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 6, borderWidth: 1, borderColor: '#D9D9D9' },
  voiceText: { color: '#555', fontSize: 14 },
  inputWrap: { flex: 1, backgroundColor: '#FFF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, maxHeight: 100, borderWidth: 1, borderColor: '#D9D9D9' },
  input: { color: '#333', fontSize: 17, maxHeight: 90, padding: 0 },
  sendBtn: { width: 64, height: 36, borderRadius: 6, backgroundColor: '#07C160', justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  sendText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  plusBtn: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginLeft: 6, borderWidth: 1, borderColor: '#D9D9D9' },
  plusText: { color: '#555', fontSize: 24, fontWeight: '300' },
  recBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F7F7F7', borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  cancel: { color: '#888', fontSize: 15 },
  recCenter: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  recDot: { color: '#07C160', fontSize: 12, marginRight: 10 },
  recTime: { color: '#333', fontSize: 16 },
  recSend: { backgroundColor: '#07C160', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, color: '#FFF', fontSize: 15, fontWeight: '600' },
  morePanel: { backgroundColor: '#F7F7F7', borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingVertical: 16, paddingHorizontal: 20 },
  moreRow: { flexDirection: 'row', gap: 40 },
  moreItem: { alignItems: 'center' },
  moreIcon: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#D9D9D9' },
  moreLabel: { color: '#666', fontSize: 12 },
  actionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0)', justifyContent: 'flex-end', alignItems: 'center' },
  actionSheet: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 100, width: '80%', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  actionItem: { paddingVertical: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  actionText: { color: '#333', fontSize: 16 },
  actionCancel: { paddingVertical: 16, alignItems: 'center' },
  cancelText: { color: '#888', fontSize: 16 },
});