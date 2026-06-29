import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Animated, Easing, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import MessageBubble from './MessageBubble';
import BurnModal from './BurnModal';
import StickerPickerModal from './StickerPickerModal';
import QuickLockButton from './QuickLockButton';
import { listConversationMessages, removeConversationMessage, sendConversationMessage } from '../../services/ChatRepository';
import { destroyExpiredMessages, BURN_OPTIONS } from '../../services/MessageService';
import { syncMessageToCloud } from '../../services/CloudService';
import { usePrivacyLockShortcut } from '../../utils/privacyLockShortcut';

const CANCEL_LOCK_THRESHOLD = -70;

function formatRecordingDuration(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

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
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [recordingCancelled, setRecordingCancelled] = useState(false);
  const [showRecordingOverlay, setShowRecordingOverlay] = useState(false);
  const { handleHeaderPress, panHandlers } = usePrivacyLockShortcut({
    onHorizontalSwipe: onBack,
    onDoubleTap: onLock,
  });
  const pressStartY = useRef(0);
  const cancelArmedRef = useRef(false);
  const recordScale = useRef(new Animated.Value(1)).current;
  const cancelHintOpacity = useRef(new Animated.Value(0)).current;
  const cancelHintTranslateY = useRef(new Animated.Value(10)).current;

  const resetAudioMode = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch {}
  }, []);

  const stopVoicePlayback = useCallback(async () => {
    try {
      sound.current.setOnPlaybackStatusUpdate(null);
      await sound.current.stopAsync().catch(() => {});
      await sound.current.unloadAsync().catch(() => {});
    } finally {
      setPlayingVoiceId(null);
    }
  }, []);

  const animateRecordingStart = useCallback(() => {
    recordScale.setValue(0.96);
    cancelHintOpacity.setValue(0);
    cancelHintTranslateY.setValue(10);
    Animated.parallel([
      Animated.spring(recordScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 16,
        bounciness: 9,
      }),
      Animated.timing(cancelHintOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(cancelHintTranslateY, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cancelHintOpacity, cancelHintTranslateY, recordScale]);

  const animateRecordingEnd = useCallback(() => {
    Animated.parallel([
      Animated.timing(cancelHintOpacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(cancelHintTranslateY, {
        toValue: 10,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(recordScale, {
        toValue: 0.98,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      recordScale.setValue(1);
      setShowRecordingOverlay(false);
    });
  }, [cancelHintOpacity, cancelHintTranslateY, recordScale]);

  const playVoiceMessage = useCallback(async (message) => {
    const targetUri = message?.uri || message?.content;
    if (!targetUri) {
      Alert.alert('语音播放失败', '未找到这条语音文件');
      return;
    }

    if (playingVoiceId === message.id) {
      await stopVoicePlayback();
      return;
    }

    try {
      await stopVoicePlayback();
      await resetAudioMode();
      sound.current.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish || status.isLoaded === false) {
          setPlayingVoiceId(null);
        }
      });
      await sound.current.loadAsync({ uri: targetUri }, { shouldPlay: true });
      setPlayingVoiceId(message.id);
    } catch (error) {
      setPlayingVoiceId(null);
      Alert.alert('语音播放失败', error.message || '暂时无法播放这条语音');
    }
  }, [playingVoiceId, resetAudioMode, stopVoicePlayback]);

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
    stopVoicePlayback().catch(() => {});
    resetAudioMode().catch(() => {});
  }, [resetAudioMode, stopVoicePlayback]);

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
      setMessages((prev) => [...prev, saved]);
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
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('权限不足', '请在设置中开启相册权限');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const msg = { uri: result.assets[0].uri, type: 'image', isMe: true };
        if (burnOption) {
          msg.burnAfterRead = true;
          msg.burnDuration = BURN_OPTIONS[burnOption];
        }
        const saved = await sendConversationMessage(contact, msg);
        setMessages((prev) => [...prev, saved]);
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
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('权限不足', '请在设置中开启相机权限');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const msg = { uri: result.assets[0].uri, type: 'image', isMe: true };
        if (burnOption) {
          msg.burnAfterRead = true;
          msg.burnDuration = BURN_OPTIONS[burnOption];
        }
        const saved = await sendConversationMessage(contact, msg);
        setMessages((prev) => [...prev, saved]);
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
      await stopVoicePlayback();
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('录音失败', '请先允许麦克风权限');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording: nextRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = nextRecording;
      recordingStartedAt.current = Date.now();
      setRecording(nextRecording);
      setRecordingDuration(0);
      setIsRecording(true);
      setRecordingCancelled(false);
      setShowRecordingOverlay(true);
      setShowMore(false);
      setShowStickerPicker(false);
      recordingTimer.current = setInterval(() => setRecordingDuration((prev) => prev + 1), 1000);
      animateRecordingStart();

      if (!voicePressActive.current) {
        stopRecording();
      }
    } catch (error) {
      recordingRef.current = null;
      recordingStartedAt.current = 0;
      setRecording(null);
      setIsRecording(false);
      setRecordingCancelled(false);
      setShowRecordingOverlay(false);
      await resetAudioMode();
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
      await resetAudioMode();

      const uri = activeRecording.getURI();
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - recordingStartedAt.current) / 1000));
      setRecording(null);
      setRecordingDuration(0);
      recordingStartedAt.current = 0;
      animateRecordingEnd();

      if (uri) {
        const msg = { uri, type: 'voice', duration: elapsedSeconds, isMe: true };
        if (burnOption) {
          msg.burnAfterRead = true;
          msg.burnDuration = BURN_OPTIONS[burnOption];
        }
        const saved = await sendConversationMessage(contact, msg);
        setMessages((prev) => [...prev, saved]);
        await syncSavedMessageToCloud(saved);
      }
    } catch (error) {
      recordingRef.current = null;
      recordingStartedAt.current = 0;
      setRecording(null);
      setRecordingDuration(0);
      setIsRecording(false);
      setRecordingCancelled(false);
      animateRecordingEnd();
      await resetAudioMode();
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
      await resetAudioMode();
      setRecording(null);
      setRecordingDuration(0);
      setRecordingCancelled(false);
      animateRecordingEnd();
    } catch {
      recordingRef.current = null;
      recordingStartedAt.current = 0;
      setRecording(null);
      setRecordingDuration(0);
      setIsRecording(false);
      setRecordingCancelled(false);
      animateRecordingEnd();
      await resetAudioMode();
    }
  };

  const handleVoicePressIn = async () => {
    if (!voiceMode || recording || isRecording) {
      return;
    }
    voicePressActive.current = true;
    cancelArmedRef.current = false;
    setRecordingCancelled(false);
    await startRecording();
  };

  const handleVoicePressMove = useCallback((event) => {
    if (!voicePressActive.current) {
      return;
    }

    const currentY = event.nativeEvent.pageY;
    const distanceY = currentY - pressStartY.current;
    const shouldCancel = distanceY <= CANCEL_LOCK_THRESHOLD;
    cancelArmedRef.current = shouldCancel;
    setRecordingCancelled(shouldCancel);
  }, []);

  const handleVoicePressOut = () => {
    voicePressActive.current = false;
    if (voiceMode && recordingRef.current) {
      if (cancelArmedRef.current) {
        cancelArmedRef.current = false;
        cancelRecording();
        return;
      }
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
      <MessageBubble
        message={item}
        isMe={item.isMe}
        onPlayVoice={item.type === 'voice' ? playVoiceMessage : undefined}
        isPlaying={playingVoiceId === item.id}
      />
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
      setMessages((prev) => [...prev, saved]);
      await syncSavedMessageToCloud(saved);
    } catch (error) {
      Alert.alert('发送失败', error.message || '无法保存表情包到本地服务器');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
      {...panHandlers}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 20) }]}>
        <TouchableOpacity style={styles.headerIconButton} onPress={onBack} accessibilityLabel="返回会话列表">
          <Ionicons name="chevron-back" size={24} color="#111111" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerCenter} activeOpacity={1} onPress={handleHeaderPress}>
          <Text style={styles.name} numberOfLines={1}>{contact.name}</Text>
          <Text style={styles.subline}>{contact.syncState === 'request_sent' ? '等待对方通过好友请求' : '本地私密 · 仅此设备'}</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconButton} onPress={onLock} accessibilityLabel="锁定应用">
            <Ionicons name="lock-closed-outline" size={19} color="#111111" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerIconButton, burnOption && styles.burnButtonActive]} onPress={() => setShowBurnModal(true)} accessibilityLabel="打开阅后即焚设置">
            <Ionicons name={burnOption ? 'flame' : 'ellipsis-horizontal'} size={18} color={burnOption ? '#2B4A0E' : '#111111'} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList data={[...messages].reverse()} renderItem={renderMsg} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list} inverted />

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
          accessibilityLabel={voiceMode ? '\u5207\u56de\u952e\u76d8\u8f93\u5165' : '\u5207\u6362\u6309\u4f4f\u8bf4\u8bdd'}
        >
          <Ionicons name={voiceMode ? 'keypad-outline' : 'mic-outline'} size={20} color="#666666" />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          {voiceMode ? (
            <Pressable
              onPressIn={(event) => {
                pressStartY.current = event.nativeEvent.pageY;
                handleVoicePressIn();
              }}
              onPressOut={handleVoicePressOut}
              onTouchMove={handleVoicePressMove}
              onTouchCancel={handleVoicePressOut}
              style={[styles.voicePressArea, isRecording && styles.voicePressAreaActive, recordingCancelled && styles.voicePressAreaCancel]}
            >
              <Text style={[styles.voicePressText, isRecording && styles.voicePressTextActive, recordingCancelled && styles.voicePressTextCancel]}>
                {recordingCancelled ? '\u677e\u624b\u53d6\u6d88' : isRecording ? '\u677e\u5f00\u53d1\u9001' : '\u6309\u4f4f \u8bf4\u8bdd'}
              </Text>
            </Pressable>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="\u8f93\u5165\u6d88\u606f"
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
              <TouchableOpacity style={styles.sendBtn} onPress={handleSend}><Text style={styles.sendText}>{'\u53d1\u9001'}</Text></TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.plusBtn} onPress={() => { setShowStickerPicker(false); setShowMore((current) => !current); }} accessibilityLabel={'\u6253\u5f00\u66f4\u591a\u529f\u80fd'}>
              <Ionicons name={showMore ? 'close-outline' : 'add'} size={20} color="#666666" />
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      <QuickLockButton onPress={onLock} bottom={Math.max(insets.bottom + 82, 96)} />

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

      {showRecordingOverlay ? (
        <View pointerEvents="none" style={styles.recordingOverlay}>
          <Animated.View
            style={[
              styles.recordingOverlayCard,
              recordingCancelled && styles.recordingOverlayCardCancel,
              { transform: [{ scale: recordScale }] },
            ]}
          >
            <Text style={styles.recordingOverlayIcon}>{recordingCancelled ? '✕' : '🎤'}</Text>
            <Text style={styles.recordingOverlayTitle}>{recordingCancelled ? '松手取消录音' : '正在录音'}</Text>
            <Text style={styles.recordingOverlaySubtitle}>{recordingCancelled ? '已进入取消区域' : '手指上滑，取消发送'}</Text>
            <Text style={styles.recordingOverlayTime}>{formatRecordingDuration(recordingDuration)}</Text>
            <Animated.View
              style={[
                styles.recordingCancelHint,
                recordingCancelled && styles.recordingCancelHintActive,
                {
                  opacity: cancelHintOpacity,
                  transform: [{ translateY: cancelHintTranslateY }],
                },
              ]}
            >
              <Text style={[styles.recordingCancelHintText, recordingCancelled && styles.recordingCancelHintTextActive]}>
                {recordingCancelled ? '松手取消' : '上滑取消'}
              </Text>
            </Animated.View>
          </Animated.View>
        </View>
      ) : null}

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
  voicePressAreaCancel: { backgroundColor: '#FDECEC' },
  voicePressText: { color: '#333333', fontSize: 15, fontWeight: '500' },
  voicePressTextActive: { color: '#111111' },
  voicePressTextCancel: { color: '#C43D3D' },
  sendBtn: { minWidth: 60, height: 36, borderRadius: 6, backgroundColor: '#95EC69', justifyContent: 'center', alignItems: 'center', marginLeft: 8, paddingHorizontal: 12 },
  sendText: { color: '#20330F', fontSize: 14, fontWeight: '600' },
  plusBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  morePanel: { backgroundColor: '#F7F7F7', borderTopWidth: 1, borderTopColor: '#D8D8D8', paddingTop: 18, paddingBottom: 22, paddingHorizontal: 18 },
  moreRow: { flexDirection: 'row', gap: 24 },
  moreItem: { alignItems: 'center', width: 72 },
  moreIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#E3E3E3' },
  moreLabel: { color: '#666666', fontSize: 12, lineHeight: 16 },
  actionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'flex-end', alignItems: 'center' },
  actionSheet: { backgroundColor: '#F7F7F7', borderRadius: 14, marginBottom: 88, width: '82%', overflow: 'hidden' },
  actionItem: { paddingVertical: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E3E3E3', backgroundColor: '#FFFFFF' },
  actionTextDanger: { color: '#E24C4B', fontSize: 16, fontWeight: '500' },
  actionCancel: { paddingVertical: 16, alignItems: 'center', backgroundColor: '#FFFFFF', marginTop: 8 },
  cancelText: { color: '#111111', fontSize: 16, fontWeight: '500' },
  recordingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  recordingOverlayCard: { width: 172, minHeight: 172, borderRadius: 24, backgroundColor: 'rgba(17,17,17,0.88)', paddingHorizontal: 18, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  recordingOverlayCardCancel: { backgroundColor: 'rgba(121, 28, 28, 0.92)' },
  recordingOverlayIcon: { fontSize: 40, marginBottom: 10, color: '#FFFFFF' },
  recordingOverlayTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  recordingOverlaySubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  recordingOverlayTime: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginTop: 14, marginBottom: 12 },
  recordingCancelHint: { minWidth: 92, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' },
  recordingCancelHintActive: { backgroundColor: '#FFFFFF' },
  recordingCancelHintText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  recordingCancelHintTextActive: { color: '#B42318' },
});
