# Soft Premium Chat UI MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark black-and-gold private chat screens with a warm soft-premium MVP UI while preserving all current calculator, chat, local backend, add contact, lock, burn, send, and modal behavior.

**Architecture:** Keep the current React Native component structure and change only presentation in `ChatList`, `ChatWindow`, and `MessageBubble`. Use one fixed color direction directly in component styles; do not add theme switching, navigation refactors, or new product features.

**Tech Stack:** Expo 54, React 19, React Native 0.81, Node/Express local backend, SQLite, Jest/Supertest backend tests.

---

## File Structure

- Modify `src/components/Chat/ChatList.js`: recolor the chat list, add comfortable safe-zone spacing, keep add/contact/lock modal flows unchanged.
- Modify `src/components/Chat/ChatWindow.js`: recolor the conversation screen, make top back/burn buttons 48x48, keep message loading, burn setting, send, media, recording, and action sheet behavior unchanged.
- Modify `src/components/Chat/MessageBubble.js`: recolor avatars, text, image, voice, and burn markers so bubbles match the warm light chat surface.
- Do not modify backend code for this UI-only change except running its existing tests.
- Do not modify `Calculator.js` unless the chat screens fail visual verification because of an obvious clash; the spec says no major calculator change is required.

## Palette to Use

- Background cream: `#F8F1E7`
- Warm ivory surface: `#FFFaf2`
- Ivory card: `#FFFDF8`
- Champagne gold: `#D7B56D`
- Soft rose: `#E8B7AA`
- Deep cocoa text: `#3A271F`
- Taupe muted text: `#8A7468`
- Hairline border: `rgba(122, 92, 73, 0.12)`
- Soft shadow: `rgba(91, 62, 45, 0.10)`
- Danger brick: `#B86555`

---

### Task 1: Restyle ChatList to soft premium

**Files:**
- Modify: `src/components/Chat/ChatList.js:65-232`
- Test: source-level style check plus `npm run lint`

- [ ] **Step 1: Run a source check that proves the current chat list is still dark**

Run from `D:/coding/private-calculator-chat`:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/components/Chat/ChatList.js','utf8');if(!s.includes('#07090D')&&!s.includes('#111821')){throw new Error('Expected pre-change dark ChatList colors to still be present');}console.log('pre-change ChatList dark colors found');"
```

Expected: PASS and print `pre-change ChatList dark colors found` before implementation.

- [ ] **Step 2: Update the ChatList status bar for the light theme**

In `src/components/Chat/ChatList.js`, change:

```jsx
<StatusBar barStyle="light-content" backgroundColor="#07090D" />
```

to:

```jsx
<StatusBar barStyle="dark-content" backgroundColor="#F8F1E7" />
```

- [ ] **Step 3: Replace the ChatList stylesheet block**

In `src/components/Chat/ChatList.js`, replace the entire `const styles = StyleSheet.create({ ... });` block with:

```js
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F1E7' },
  glowTop: { position: 'absolute', top: -130, right: -90, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(232,183,170,0.24)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },
  eyebrow: { color: '#A28A7C', fontSize: 11, fontWeight: '800', letterSpacing: 2.2, marginBottom: 6 },
  title: { color: '#3A271F', fontSize: 34, fontWeight: '800', letterSpacing: 1 },
  searchButton: { width: 50, height: 50, borderRadius: 19, backgroundColor: '#D7B56D', justifyContent: 'center', alignItems: 'center', shadowColor: '#B89455', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 7 },
  searchIcon: { color: '#3A271F', fontSize: 28, fontWeight: '300', marginTop: -2 },
  statusCard: { marginHorizontal: 18, marginBottom: 14, padding: 16, borderRadius: 24, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: 'rgba(122,92,73,0.12)', flexDirection: 'row', alignItems: 'center', shadowColor: '#5B3E2D', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8FBF9A', marginRight: 12, shadowColor: '#8FBF9A', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 8 },
  statusCopy: { flex: 1 },
  statusTitle: { color: '#3A271F', fontSize: 14, fontWeight: '800' },
  statusText: { color: '#8A7468', fontSize: 12, marginTop: 3 },
  lockPill: { minHeight: 36, paddingHorizontal: 13, borderRadius: 999, backgroundColor: 'rgba(232,183,170,0.22)', justifyContent: 'center' },
  lockText: { color: '#7A5047', fontSize: 12, fontWeight: '800' },
  listContent: { flexGrow: 1, paddingHorizontal: 14, paddingBottom: 116 },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 12, borderRadius: 26, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: 'rgba(122,92,73,0.12)', shadowColor: '#5B3E2D', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 2 },
  firstContact: { borderColor: 'rgba(215,181,109,0.32)' },
  avatarShell: { width: 56, height: 56, borderRadius: 21, backgroundColor: 'rgba(232,183,170,0.26)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatar: { width: 46, height: 46, borderRadius: 18, backgroundColor: '#E8B7AA', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#3A271F', fontSize: 20, fontWeight: '900' },
  contactInfo: { flex: 1 },
  contactTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  contactName: { color: '#3A271F', fontSize: 17, fontWeight: '800' },
  time: { color: '#B29A8E', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  preview: { color: '#8A7468', fontSize: 14 },
  chevron: { color: '#D1BFB3', fontSize: 26, marginLeft: 8, marginBottom: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 140 },
  emptyIcon: { color: '#D7B56D', fontSize: 54, marginBottom: 18, fontWeight: '200' },
  emptyTitle: { color: '#3A271F', fontSize: 19, fontWeight: '800', marginBottom: 8 },
  emptyHint: { color: '#8A7468', fontSize: 14 },
  tabBar: { position: 'absolute', left: 16, right: 16, bottom: 14, flexDirection: 'row', backgroundColor: 'rgba(255,250,242,0.96)', borderWidth: 1, borderColor: 'rgba(122,92,73,0.13)', borderRadius: 28, paddingVertical: 9, shadowColor: '#5B3E2D', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabIcon: { color: '#D7B56D', fontSize: 18, marginBottom: 3 },
  tabIconMuted: { color: '#B7A69D', fontSize: 18, marginBottom: 3 },
  tabText: { color: '#7A5A34', fontSize: 12, fontWeight: '800' },
  tabTextMuted: { color: '#9A877D', fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(58,39,31,0.36)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { width: '100%', backgroundColor: '#FFFDF8', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: 'rgba(122,92,73,0.14)' },
  modalKicker: { color: '#B89455', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  modalTitle: { color: '#3A271F', fontSize: 22, fontWeight: '900', marginBottom: 22 },
  input: { backgroundColor: '#FFFaf2', color: '#3A271F', borderRadius: 16, padding: 15, marginBottom: 14, fontSize: 16, borderWidth: 1, borderColor: 'rgba(122,92,73,0.12)' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 10 },
  modalButton: { flex: 1, padding: 15, borderRadius: 16, alignItems: 'center' },
  cancelButton: { backgroundColor: '#F0E4D9' },
  addButton: { backgroundColor: '#D7B56D' },
  cancelButtonText: { color: '#7D675D', fontSize: 15, fontWeight: '800' },
  addButtonText: { color: '#3A271F', fontSize: 15, fontWeight: '900' },
  modalButtonText: { color: '#3A271F', fontSize: 16, fontWeight: '600' },
  actionSheetOverlay: { flex: 1, backgroundColor: 'rgba(58,39,31,0.32)', justifyContent: 'flex-end' },
  actionSheetContent: { backgroundColor: '#FFFDF8', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 28, paddingTop: 16, borderWidth: 1, borderColor: 'rgba(122,92,73,0.12)' },
  actionSheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  actionSheetIconBg: { width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(215,181,109,0.18)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  actionSheetIcon: { color: '#9A6B2F', fontSize: 18, fontWeight: '800' },
  actionSheetItemText: { color: '#3A271F', fontSize: 17, fontWeight: '700' },
  lockButtonAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  actionSheetCancel: { marginTop: 8, paddingVertical: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(122,92,73,0.10)' },
  actionSheetCancelText: { color: '#8A7468', fontSize: 16, fontWeight: '700' },
  qrModalContent: { backgroundColor: '#FFFDF8', borderRadius: 24, padding: 24, width: '84%', maxWidth: 340, alignItems: 'center' },
  closeButton: { position: 'absolute', top: 14, right: 18, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  closeButtonText: { color: '#9A6B2F', fontSize: 20 },
});
```

- [ ] **Step 4: Run a source check that proves ChatList moved to the light palette**

Run from `D:/coding/private-calculator-chat`:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/components/Chat/ChatList.js','utf8');for(const c of ['#07090D','#111821','#101720']){if(s.includes(c))throw new Error('ChatList still contains dark color '+c);}for(const c of ['#F8F1E7','#FFFDF8','#E8B7AA','#3A271F']){if(!s.includes(c))throw new Error('ChatList missing soft premium color '+c);}if(!s.includes('width: 50')||!s.includes('height: 50'))throw new Error('Add button is not clearly above 44x44');console.log('ChatList soft premium source check passed');"
```

Expected: PASS and print `ChatList soft premium source check passed`.

- [ ] **Step 5: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with no new lint errors.

- [ ] **Step 6: Commit ChatList styling**

```bash
git add src/components/Chat/ChatList.js
git commit -m "style: soften chat list theme"
```

---

### Task 2: Restyle MessageBubble to light diary bubbles

**Files:**
- Modify: `src/components/Chat/MessageBubble.js:43-68`
- Test: source-level style check plus `npm run lint`

- [ ] **Step 1: Run a source check that proves message bubbles are still dark/gold**

Run from `D:/coding/private-calculator-chat`:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/components/Chat/MessageBubble.js','utf8');if(!s.includes('#121A24')&&!s.includes('#26313C')){throw new Error('Expected pre-change dark MessageBubble colors to still be present');}console.log('pre-change MessageBubble dark colors found');"
```

Expected: PASS and print `pre-change MessageBubble dark colors found` before implementation.

- [ ] **Step 2: Replace the MessageBubble stylesheet block**

In `src/components/Chat/MessageBubble.js`, replace the entire `const styles = StyleSheet.create({ ... });` block with:

```js
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', marginVertical: 7, marginHorizontal: 14, alignItems: 'flex-end' },
  wrapMe: { justifyContent: 'flex-end' },
  wrapOther: { justifyContent: 'flex-start' },
  avatar: { width: 38, height: 38, borderRadius: 15, backgroundColor: '#F2DDD4', justifyContent: 'center', alignItems: 'center', marginRight: 9, borderWidth: 1, borderColor: 'rgba(122,92,73,0.12)' },
  avatarText: { color: '#8A5B50', fontSize: 14, fontWeight: '900' },
  myAvatar: { width: 38, height: 38, borderRadius: 15, backgroundColor: '#D7B56D', justifyContent: 'center', alignItems: 'center', marginLeft: 9 },
  myAvatarText: { color: '#3A271F', fontSize: 12, fontWeight: '900' },
  bubble: { maxWidth: '72%', paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1 },
  bubbleMe: { backgroundColor: '#E8B7AA', borderRadius: 19, borderBottomRightRadius: 6, borderColor: 'rgba(184,101,85,0.16)', shadowColor: '#A96F63', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 15, elevation: 3 },
  bubbleOther: { backgroundColor: '#FFFDF8', borderRadius: 19, borderBottomLeftRadius: 6, borderColor: 'rgba(122,92,73,0.12)', shadowColor: '#5B3E2D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  text: { fontSize: 16, lineHeight: 24, color: '#3A271F', fontWeight: '500' },
  textMe: { color: '#3A271F', fontWeight: '700' },
  img: { width: 184, height: 138, borderRadius: 15 },
  voice: { flexDirection: 'row', alignItems: 'center', minWidth: 128 },
  playBtn: { width: 26, height: 26, borderRadius: 10, backgroundColor: 'rgba(215,181,109,0.22)', justifyContent: 'center', alignItems: 'center', marginRight: 9 },
  playBtnMe: { backgroundColor: 'rgba(58,39,31,0.13)' },
  playIcon: { fontSize: 10, color: '#9A6B2F', marginLeft: 1, fontWeight: '900' },
  wave: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 6, height: 26 },
  bar: { width: 3, backgroundColor: '#D7B56D', borderRadius: 2, marginHorizontal: 1.5, opacity: 0.82 },
  barMe: { backgroundColor: '#6E433B', opacity: 0.62 },
  dur: { fontSize: 13, color: '#8A7468', fontWeight: '700' },
  durMe: { color: '#5C3931' },
  burn: { fontSize: 10, position: 'absolute', bottom: 5, right: 7, color: '#B86555', fontWeight: '900' },
  burnMe: { color: 'rgba(58,39,31,0.58)' },
});
```

- [ ] **Step 3: Run a source check that proves bubbles moved to warm light colors**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/components/Chat/MessageBubble.js','utf8');for(const c of ['#121A24','#26313C','#111318']){if(s.includes(c))throw new Error('MessageBubble still contains dark color '+c);}for(const c of ['#FFFDF8','#E8B7AA','#3A271F','#B86555']){if(!s.includes(c))throw new Error('MessageBubble missing soft premium color '+c);}console.log('MessageBubble soft premium source check passed');"
```

Expected: PASS and print `MessageBubble soft premium source check passed`.

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with no new lint errors.

- [ ] **Step 5: Commit MessageBubble styling**

```bash
git add src/components/Chat/MessageBubble.js
git commit -m "style: soften chat message bubbles"
```

---

### Task 3: Restyle ChatWindow with comfortable top controls and thumb-friendly input

**Files:**
- Modify: `src/components/Chat/ChatWindow.js:156-267`
- Test: source-level style check plus `npm run lint`

- [ ] **Step 1: Run a source check that proves ChatWindow is still dark and undersized at the top**

Run from `D:/coding/private-calculator-chat`:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/components/Chat/ChatWindow.js','utf8');if(!s.includes('#07090D')&&!s.includes('#0B1017')){throw new Error('Expected pre-change dark ChatWindow colors to still be present');}if(!s.includes('width: 42')&&!s.includes('height: 42')){throw new Error('Expected pre-change 42px top controls to still be present');}console.log('pre-change ChatWindow dark colors and 42px controls found');"
```

Expected: PASS and print `pre-change ChatWindow dark colors and 42px controls found` before implementation.

- [ ] **Step 2: Change the header subtitle copy to match the soft local-private tone**

In `src/components/Chat/ChatWindow.js`, change:

```jsx
<Text style={styles.subline}>LOCAL · ENDPOINT SECURED</Text>
```

to:

```jsx
<Text style={styles.subline}>本地私密 · 仅此设备</Text>
```

- [ ] **Step 3: Update the input placeholder color for the light input**

In `src/components/Chat/ChatWindow.js`, change:

```jsx
<TextInput style={styles.input} placeholder="输入密谈内容" placeholderTextColor="#5F6A75" value={inputText} onChangeText={setInputText} multiline />
```

to:

```jsx
<TextInput style={styles.input} placeholder="输入密谈内容" placeholderTextColor="#A28A7C" value={inputText} onChangeText={setInputText} multiline />
```

- [ ] **Step 4: Replace the ChatWindow stylesheet block**

In `src/components/Chat/ChatWindow.js`, replace the entire `const styles = StyleSheet.create({ ... });` block with:

```js
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F1E7' },
  glow: { position: 'absolute', top: -120, left: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(232,183,170,0.24)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 22, paddingBottom: 14, backgroundColor: 'rgba(248,241,231,0.96)', borderBottomWidth: 1, borderBottomColor: 'rgba(122,92,73,0.10)' },
  backButton: { width: 48, height: 48, borderRadius: 18, backgroundColor: '#FFFDF8', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(122,92,73,0.13)', shadowColor: '#5B3E2D', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 2 },
  back: { color: '#9A6B2F', fontSize: 34, fontWeight: '300', marginTop: -3 },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  name: { color: '#3A271F', fontSize: 18, fontWeight: '900' },
  subline: { color: '#8A7468', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginTop: 4 },
  burnButton: { minWidth: 48, height: 48, borderRadius: 18, backgroundColor: '#FFFDF8', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 9, borderWidth: 1, borderColor: 'rgba(122,92,73,0.13)', shadowColor: '#5B3E2D', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 2 },
  burnButtonActive: { borderColor: 'rgba(184,101,85,0.26)', backgroundColor: '#F7E4DE' },
  burnBtn: { color: '#B86555', fontSize: 14, fontWeight: '900' },
  burnBtnActive: { color: '#B86555' },
  list: { flexGrow: 1, paddingVertical: 16, backgroundColor: 'transparent' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, backgroundColor: '#FFFaf2', borderTopWidth: 1, borderTopColor: 'rgba(122,92,73,0.10)' },
  voiceBtn: { width: 60, height: 44, borderRadius: 16, backgroundColor: '#F0E4D9', justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: 'rgba(122,92,73,0.10)' },
  voiceText: { color: '#7D675D', fontSize: 13, fontWeight: '800' },
  inputWrap: { flex: 1, backgroundColor: '#FFFDF8', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 104, borderWidth: 1, borderColor: 'rgba(122,92,73,0.12)' },
  input: { color: '#3A271F', fontSize: 16, maxHeight: 90, padding: 0, fontWeight: '500' },
  sendBtn: { width: 64, height: 44, borderRadius: 16, backgroundColor: '#D7B56D', justifyContent: 'center', alignItems: 'center', marginLeft: 8, shadowColor: '#B89455', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 14, elevation: 4 },
  sendText: { color: '#3A271F', fontSize: 14, fontWeight: '900' },
  plusBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#F0E4D9', justifyContent: 'center', alignItems: 'center', marginLeft: 8, borderWidth: 1, borderColor: 'rgba(122,92,73,0.10)' },
  plusText: { color: '#9A6B2F', fontSize: 23, fontWeight: '300', marginTop: -2 },
  recBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: '#FFFaf2', borderTopWidth: 1, borderTopColor: 'rgba(122,92,73,0.10)' },
  cancel: { color: '#8A7468', fontSize: 15, fontWeight: '700' },
  recCenter: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  recDot: { color: '#B86555', fontSize: 12, marginRight: 10 },
  recTime: { color: '#3A271F', fontSize: 16, fontWeight: '800' },
  recSend: { backgroundColor: '#D7B56D', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 13, color: '#3A271F', fontSize: 15, fontWeight: '900' },
  morePanel: { backgroundColor: '#FFFaf2', borderTopWidth: 1, borderTopColor: 'rgba(122,92,73,0.10)', paddingVertical: 18, paddingHorizontal: 22 },
  moreRow: { flexDirection: 'row', gap: 34 },
  moreItem: { alignItems: 'center' },
  moreIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#FFFDF8', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(215,181,109,0.20)' },
  moreGlyph: { color: '#9A6B2F', fontSize: 20, fontWeight: '900' },
  moreLabel: { color: '#8A7468', fontSize: 12, fontWeight: '700' },
  actionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(58,39,31,0.34)', justifyContent: 'flex-end', alignItems: 'center' },
  actionSheet: { backgroundColor: '#FFFDF8', borderRadius: 22, marginBottom: 96, width: '82%', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(122,92,73,0.12)' },
  actionItem: { paddingVertical: 17, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(122,92,73,0.10)' },
  actionText: { color: '#3A271F', fontSize: 16, fontWeight: '800' },
  actionTextDanger: { color: '#B86555', fontSize: 16, fontWeight: '900' },
  actionCancel: { paddingVertical: 17, alignItems: 'center' },
  cancelText: { color: '#8A7468', fontSize: 16, fontWeight: '800' },
});
```

- [ ] **Step 5: Run a source check that proves ChatWindow moved to soft premium and 48x48 top controls**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/components/Chat/ChatWindow.js','utf8');for(const c of ['#07090D','#0B1017','#111821']){if(s.includes(c))throw new Error('ChatWindow still contains dark color '+c);}for(const c of ['#F8F1E7','#FFFaf2','#FFFDF8','#3A271F']){if(!s.includes(c))throw new Error('ChatWindow missing soft premium color '+c);}if(!s.includes('width: 48')||!s.includes('height: 48')||s.includes('width: 42')||s.includes('height: 42'))throw new Error('Top controls are not clearly 48x48');if(!s.includes('本地私密 · 仅此设备'))throw new Error('Header subtitle did not change to local private copy');console.log('ChatWindow soft premium source check passed');"
```

Expected: PASS and print `ChatWindow soft premium source check passed`.

- [ ] **Step 6: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with no new lint errors.

- [ ] **Step 7: Commit ChatWindow styling**

```bash
git add src/components/Chat/ChatWindow.js
git commit -m "style: soften chat window theme"
```

---

### Task 4: Full verification and phone visual check

**Files:**
- Verify: `src/components/Chat/ChatList.js`
- Verify: `src/components/Chat/ChatWindow.js`
- Verify: `src/components/Chat/MessageBubble.js`
- Verify: `backend/tests/api.test.js`

- [ ] **Step 1: Run lint for the full Expo project**

Run from `D:/coding/private-calculator-chat`:

```bash
npm run lint
```

Expected: PASS with no new lint errors.

- [ ] **Step 2: Run backend integration tests to confirm UI changes did not affect local persistence behavior**

Run:

```bash
npm test --prefix backend
```

Expected: PASS. Existing tests should cover health, contacts, message persistence, and delete behavior.

- [ ] **Step 3: Run Android export**

Run:

```bash
npx expo export --platform android
```

Expected: PASS and generate/update Expo export output without route or bundling errors.

- [ ] **Step 4: Run Web export**

Run:

```bash
npx expo export --platform web
```

Expected: PASS and generate/update Expo web export output without missing assets or route errors.

- [ ] **Step 5: Start or confirm the backend for Expo Go testing**

If the private chat backend is not already running on port `3102`, run:

```bash
PORT=3102 npm run dev --prefix backend
```

Expected backend health check URL: `http://YOUR_COMPUTER_LAN_IP:3102/health` returns JSON with `"status":"ok"`.

- [ ] **Step 6: Start Expo for phone visual verification**

Run:

```bash
npm start
```

Expected: Expo starts on LAN. In Expo Go, open the displayed QR code or the LAN URL shown by Expo.

- [ ] **Step 7: Verify the golden path in Expo Go**

On the phone:

1. Open the calculator-looking app.
2. Enter PIN `EXPO_PUBLIC_APP_UNLOCK_PIN` and press `=`.
3. Confirm the chat list is cream/warm ivory, not black-gold.
4. Confirm the top add button is visually below the status-bar area and is at least 44x44.
5. Open a contact.
6. Confirm the back and burn buttons are 48x48 and comfortably tappable.
7. Confirm other messages use ivory bubbles and own messages use soft rose/champagne warmth.
8. Send a text message and confirm it appears in the conversation.
9. Long-press a message and confirm the existing action sheet still opens.
10. Go back to the chat list and tap `隐身` or `锁定`; confirm it returns to the calculator.

Expected: all behavior works as before, with soft premium light styling.

- [ ] **Step 8: Commit verification notes only if verification required small code changes**

If no code changed during verification, do not create a commit. If verification required a small styling fix, run:

```bash
git add src/components/Chat/ChatList.js src/components/Chat/ChatWindow.js src/components/Chat/MessageBubble.js
git commit -m "style: polish soft premium chat ui"
```

Expected: commit created only when there are actual code changes.

---

## Self-Review

- Spec coverage: Task 1 covers ChatList warm/light background, safe top spacing, contact cards, add button size, status card, and bottom navigation. Task 2 covers readable warm message bubbles and softened avatars. Task 3 covers ChatWindow cream background, 48x48 back/burn controls, local/private subtitle, bottom input controls, and light modal/action surfaces. Task 4 covers lint, backend tests, Android export, Web export, and Expo Go visual verification.
- Placeholder scan: no `TBD`, `TODO`, `implement later`, or open-ended placeholder steps are present.
- Scope check: the plan does not build theme switching, onboarding, cloud features, media features, or navigation refactors.
- Behavior preservation: all steps edit style/copy only; existing handlers, state, storage calls, modal flows, and navigation behavior remain unchanged.
