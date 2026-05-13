const STICKERS = [
  { id: 'smile', label: '开心', emoji: '😄', accentColor: '#D18A11' },
  { id: 'laugh', label: '笑哭', emoji: '😂', accentColor: '#2D72C9' },
  { id: 'heart', label: '比心', emoji: '🫶', accentColor: '#D54B72' },
  { id: 'hug', label: '抱抱', emoji: '🤗', accentColor: '#2D8A55' },
  { id: 'cheer', label: '加油', emoji: '💪', accentColor: '#5B64D6' },
  { id: 'night', label: '晚安', emoji: '🌙', accentColor: '#6B56D8' },
  { id: 'kiss', label: '亲亲', emoji: '😘', accentColor: '#D46B32' },
  { id: 'angry', label: '生气', emoji: '😤', accentColor: '#CE4A4A' },
  { id: 'cry', label: '哭哭', emoji: '😭', accentColor: '#2E86C1' },
  { id: 'ok', label: '收到', emoji: '👌', accentColor: '#5A5F68' },
  { id: 'melon', label: '吃瓜', emoji: '🍉', accentColor: '#C27A16' },
  { id: 'toast', label: '干杯', emoji: '🥂', accentColor: '#AB53C0' },
];

function getStickerById(stickerId) {
  for (var i = 0; i < STICKERS.length; i += 1) {
    if (STICKERS[i].id === stickerId) {
      return STICKERS[i];
    }
  }
  return null;
}

module.exports = {
  STICKERS,
  getStickerById,
};
