export const STICKERS = [
  { id: 'smile', label: '开心', emoji: '😄', backgroundColor: '#FFF4D6', accentColor: '#D18A11' },
  { id: 'laugh', label: '笑哭', emoji: '😂', backgroundColor: '#E9F4FF', accentColor: '#2D72C9' },
  { id: 'heart', label: '比心', emoji: '🫶', backgroundColor: '#FFE7EC', accentColor: '#D54B72' },
  { id: 'hug', label: '抱抱', emoji: '🤗', backgroundColor: '#EAF8F0', accentColor: '#2D8A55' },
  { id: 'cheer', label: '加油', emoji: '💪', backgroundColor: '#EEF0FF', accentColor: '#5B64D6' },
  { id: 'night', label: '晚安', emoji: '🌙', backgroundColor: '#F0ECFF', accentColor: '#6B56D8' },
  { id: 'kiss', label: '亲亲', emoji: '😘', backgroundColor: '#FFF0E7', accentColor: '#D46B32' },
  { id: 'angry', label: '生气', emoji: '😤', backgroundColor: '#FFF0F0', accentColor: '#CE4A4A' },
  { id: 'cry', label: '哭哭', emoji: '😭', backgroundColor: '#E8F7FF', accentColor: '#2E86C1' },
  { id: 'ok', label: '收到', emoji: '👌', backgroundColor: '#F1F3F4', accentColor: '#5A5F68' },
  { id: 'melon', label: '吃瓜', emoji: '🍉', backgroundColor: '#FFF6D9', accentColor: '#C27A16' },
  { id: 'toast', label: '干杯', emoji: '🥂', backgroundColor: '#FCEBFF', accentColor: '#AB53C0' },
];

export function getStickerById(stickerId) {
  return STICKERS.find((item) => item.id === stickerId) || null;
}
