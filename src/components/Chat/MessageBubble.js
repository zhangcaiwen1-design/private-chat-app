import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OTHER_AVATAR_COLORS = ['#D9C6A5', '#D2DDF3', '#DCD4F6', '#CDE8D0', '#F1D2C8'];

function resolveOtherAvatarStyle(seed = '') {
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const backgroundColor = OTHER_AVATAR_COLORS[total % OTHER_AVATAR_COLORS.length];
  return { backgroundColor };
}

export default function MessageBubble({ message, isMe, onPlayVoice }) {
  const [playing, setPlaying] = useState(false);

  const handlePlayVoice = async () => {
    if (playing) return;
    setPlaying(true);
    if (onPlayVoice) await onPlayVoice(message.uri);
    setPlaying(false);
  };

  const renderContent = () => {
    if (message.type === 'image') {
      return (
        <View style={styles.imageWrap}>
          <Image source={{ uri: message.uri }} style={styles.img} resizeMode="cover" />
        </View>
      );
    }
    if (message.type === 'voice') {
      return (
        <TouchableOpacity activeOpacity={0.75} style={[styles.voice, isMe ? styles.voiceMe : styles.voiceOther]} onPress={handlePlayVoice}>
          {!isMe ? <Ionicons name={playing ? 'pause' : 'play'} size={15} color="#666666" style={styles.voiceIcon} /> : null}
          <View style={[styles.wave, isMe && styles.waveMe]}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <View
                key={index}
                style={[
                  styles.bar,
                  isMe && styles.barMe,
                  playing && styles.barPlaying,
                  { height: [6, 10, 14, 18, 12, 8][index] },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.dur, isMe && styles.durMe]}>{message.duration}″</Text>
          {isMe ? <Ionicons name={playing ? 'pause' : 'play'} size={15} color="#2A5110" style={styles.voiceIconRight} /> : null}
        </TouchableOpacity>
      );
    }
    return <Text style={[styles.text, isMe && styles.textMe]}>{message.text}</Text>;
  };

  const isImage = message.type === 'image';
  const contactSeed = message.contactName || message.name || message.text || '友';

  return (
    <View style={[styles.wrap, isMe ? styles.wrapMe : styles.wrapOther]}>
      {!isMe && <View style={[styles.avatar, resolveOtherAvatarStyle(contactSeed)]}><Text style={styles.avatarText}>{message.contactName?.slice?.(0, 1) || '友'}</Text></View>}
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, isImage && styles.imageBubble]}>
        {renderContent()}
        {message.burnAfterRead && <Text style={[styles.burn, isMe && styles.burnMe, isImage && styles.imageBurn]}>{isImage ? '阅后即焚' : '焚'}</Text>}
      </View>
      {isMe && <View style={styles.myAvatar}><Text style={styles.myAvatarText}>我</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', marginVertical: 4, marginHorizontal: 12, alignItems: 'flex-end' },
  wrapMe: { justifyContent: 'flex-end' },
  wrapOther: { justifyContent: 'flex-start' },
  avatar: { width: 36, height: 36, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarText: { color: '#4C4338', fontSize: 14, fontWeight: '700' },
  myAvatar: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#95EC69', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  myAvatarText: { color: '#213011', fontSize: 13, fontWeight: '700' },
  bubble: { maxWidth: '72%', paddingVertical: 10, paddingHorizontal: 12, position: 'relative' },
  bubbleMe: { backgroundColor: '#95EC69', borderRadius: 5, marginRight: 2 },
  bubbleOther: { backgroundColor: '#FFFFFF', borderRadius: 5, marginLeft: 2 },
  imageBubble: { paddingVertical: 0, paddingHorizontal: 0, backgroundColor: 'transparent', overflow: 'visible', borderRadius: 12 },
  text: { fontSize: 16, lineHeight: 22, color: '#111111' },
  textMe: { color: '#111111' },
  imageWrap: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#DADADA' },
  img: { width: 186, height: 146, borderRadius: 12, backgroundColor: '#DADADA' },
  voice: { flexDirection: 'row', alignItems: 'center', minWidth: 122 },
  voiceOther: { justifyContent: 'flex-start' },
  voiceMe: { justifyContent: 'flex-end' },
  voiceIcon: { marginRight: 7 },
  voiceIconRight: { marginLeft: 7 },
  wave: { flexDirection: 'row', alignItems: 'flex-end', marginRight: 2, height: 22 },
  waveMe: { marginRight: 0, marginLeft: 2 },
  bar: { width: 2.5, backgroundColor: '#7C7C7C', borderRadius: 2, marginHorizontal: 1.5, opacity: 0.82 },
  barMe: { backgroundColor: '#355E14' },
  barPlaying: { opacity: 1 },
  dur: { fontSize: 13, color: '#666666', marginLeft: 8 },
  durMe: { color: '#355E14', marginLeft: 0, marginRight: 8 },
  burn: { fontSize: 10, position: 'absolute', bottom: 4, right: 6, color: '#6F6F6F', fontWeight: '700' },
  burnMe: { color: '#355E14' },
  imageBurn: { backgroundColor: 'rgba(0,0,0,0.44)', color: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, bottom: 8, right: 8, overflow: 'hidden' },
});
