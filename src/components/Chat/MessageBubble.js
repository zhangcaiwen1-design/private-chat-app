import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

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
      return <Image source={{ uri: message.uri }} style={styles.img} resizeMode="cover" />;
    }
    if (message.type === 'voice') {
      return (
        <View style={styles.voice}>
          <View style={[styles.playBtn, isMe && styles.playBtnMe]}><Text style={styles.playIcon}>{playing ? '⏸' : '▶'}</Text></View>
          <View style={styles.wave}>
            {[1,2,3,4,5].map(i => <View key={i} style={[styles.bar, isMe && styles.barMe]} />)}
          </View>
          <Text style={styles.dur}>{message.duration}″</Text>
        </View>
      );
    }
    return <Text style={[styles.text, isMe && styles.textMe]}>{message.text}</Text>;
  };

  return (
    <View style={[styles.wrap, isMe ? styles.wrapMe : styles.wrapOther]}>
      {!isMe && <View style={styles.avatar}><Text style={styles.avatarText}>张</Text></View>}
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        {renderContent()}
        {message.burnAfterRead && <Text style={[styles.burn, isMe && styles.burnMe]}>🔥</Text>}
      </View>
      {isMe && <View style={styles.myAvatar}><Text style={styles.myAvatarText}>我</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', marginVertical: 4, marginHorizontal: 14, alignItems: 'flex-end' },
  wrapMe: { justifyContent: 'flex-end' },
  wrapOther: { justifyContent: 'flex-start' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#07C160', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  myAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  myAvatarText: { color: '#888', fontSize: 12, fontWeight: '500' },
  bubble: { maxWidth: '70%', paddingVertical: 10, paddingHorizontal: 12 },
  bubbleMe: { backgroundColor: '#9EEA6A', borderRadius: 12, borderBottomRightRadius: 2 },
  bubbleOther: { backgroundColor: '#FFF', borderRadius: 12, borderBottomLeftRadius: 2 },
  text: { fontSize: 17, lineHeight: 24, color: '#191919' },
  textMe: { color: '#191919' },
  img: { width: 180, height: 135, borderRadius: 8 },
  voice: { flexDirection: 'row', alignItems: 'center', minWidth: 100 },
  playBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#07C160', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  playBtnMe: { backgroundColor: '#07C160' },
  playIcon: { fontSize: 11, color: '#fff', marginLeft: 2 },
  wave: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, height: 20 },
  bar: { width: 3, height: 16, backgroundColor: '#07C160', borderRadius: 2, marginHorizontal: 1 },
  barMe: { backgroundColor: '#07C160' },
  dur: { fontSize: 14, color: '#191919' },
  burn: { fontSize: 11, position: 'absolute', bottom: 4, right: 6 },
  burnMe: { color: 'rgba(0,0,0,0.5)' },
});