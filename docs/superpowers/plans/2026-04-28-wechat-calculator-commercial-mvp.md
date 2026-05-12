# WeChat Calculator Commercial MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first commercial MVP surface: a believable Xiaomi-style calculator entrance, WeChat-like private chat polish, one-tap lock back to calculator, and a demo-only ¥9.9/month membership/gifting page.

**Architecture:** Keep the current Expo/React Native app and local Node/Express/SQLite backend. Add one frontend-only membership route and component; keep payment, cloud vault, account binding, and real gifting out of scope. Preserve existing calculator PIN unlock and local message/contact persistence.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, Expo Router entry, local Express backend, SQLite via `better-sqlite3`, Jest/Supertest backend tests.

---

## File Structure

**Modify:**
- `src/components/Calculator/Calculator.js` — Replace the current dark CASIO-like calculator with a full-screen Xiaomi-style light phone calculator while preserving PIN unlock and basic arithmetic.
- `src/utils/constants.js` — Add a `MEMBERSHIP` screen constant.
- `src/App.js` — Add membership screen state routing and pass an `onOpenMembership` callback into the chat list.
- `src/components/Chat/ChatList.js` — Make the list more WeChat-like, remove suspicious English/security copy, add a non-intrusive membership entry in the existing action sheet, and preserve lock/add-contact flows.
- `src/components/Chat/ChatWindow.js` — Polish copy and bottom input labels so the chat feels closer to WeChat without adding privacy-control clutter.

**Create:**
- `src/components/Membership/MembershipPage.js` — Demo-only membership/value page showing `轻语月卡`, `9.9 元/月`, benefits, `赠送 TA 月卡`, and a modal explaining the future gifting flow.

**No backend changes:**
- Membership and gifting are UI-only in this MVP.
- Existing backend tests still run to confirm contact/message persistence was not affected.

**Checkpoint note:** This workspace may not be initialized as a git repository. Where steps say “commit,” run `git status` first. If Git reports “not a git repository,” skip the commit and record the changed files in the task result.

---

### Task 1: Redesign Calculator Entrance

**Files:**
- Modify: `src/components/Calculator/Calculator.js`

- [ ] **Step 1: Confirm current calculator behavior before editing**

Read `src/components/Calculator/Calculator.js` and verify these behaviors are still present before changing the file:

```js
import { PIN } from '../../utils/constants';
import { authenticateWithBiometric } from '../../services/AuthService';

if (input === PIN && operator === null) {
  authenticateWithBiometric()
    .then(() => {
      onUnlock();
    });
}
```

Expected: current file contains PIN-based unlock and a `safeEvaluate` helper.

- [ ] **Step 2: Replace `Calculator.js` with the Xiaomi-style MVP implementation**

Replace the full file with:

```js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { PIN } from '../../utils/constants';
import { authenticateWithBiometric } from '../../services/AuthService';

const KEYS = [
  ['AC', '⌫', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['⇄', '0', '.', '='],
];

function normalizeExpression(expr) {
  return expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
}

function formatNumber(value) {
  const valueText = String(value).includes('.') ? value.toFixed(8).replace(/\.?0+$/, '') : String(value);
  return valueText.length > 12 ? Number(value).toExponential(6) : valueText;
}

function safeEvaluate(expr) {
  const normalized = normalizeExpression(expr);
  if (!/^[0-9+\-*/.]+$/.test(normalized)) return { error: true };
  const tokens = normalized.match(/(\d+\.?\d*|[+\-*/])/g);
  if (!tokens || tokens.length === 0) return { error: true };
  let result = parseFloat(tokens[0]);
  if (Number.isNaN(result)) return { error: true };
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const num = parseFloat(tokens[i + 1]);
    if (Number.isNaN(num)) return { error: true };
    switch (op) {
      case '+': result += num; break;
      case '-': result -= num; break;
      case '*': result *= num; break;
      case '/':
        if (num === 0) return { error: true };
        result /= num;
        break;
      default: return { error: true };
    }
  }
  return { value: result };
}

function isOperator(key) {
  return ['÷', '×', '−', '+'].includes(key);
}

export default function Calculator({ onUnlock }) {
  const [display, setDisplay] = useState('0');
  const [input, setInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const resetCalculator = () => {
    setDisplay('0');
    setInput('');
  };

  const appendDigit = (key) => {
    if (display === '计算中...') resetCalculator();
    if (key === '.' && input.split(/[+\-×÷−]/).pop().includes('.')) return;
    const nextInput = input === '0' && key !== '.' ? key : input + key;
    setInput(nextInput);
    setDisplay(nextInput || '0');
  };

  const appendOperator = (key) => {
    if (!input) return;
    const nextInput = isOperator(input.slice(-1)) ? input.slice(0, -1) + key : input + key;
    setInput(nextInput);
    setDisplay(nextInput);
  };

  const deleteLast = () => {
    const nextInput = input.slice(0, -1);
    setInput(nextInput);
    setDisplay(nextInput || '0');
  };

  const applyPercent = () => {
    if (!input || isOperator(input.slice(-1))) return;
    const result = safeEvaluate(input);
    if (result.error) return;
    const nextValue = formatNumber(result.value / 100);
    setInput(nextValue);
    setDisplay(nextValue);
  };

  const handleEqual = () => {
    if (input === PIN) {
      setVerifying(true);
      setDisplay('计算中...');
      authenticateWithBiometric()
        .then(() => {
          resetCalculator();
          setVerifying(false);
          onUnlock();
        })
        .catch(() => {
          setVerifying(false);
          resetCalculator();
        });
      return;
    }

    const result = safeEvaluate(input);
    if (result.error) {
      resetCalculator();
      return;
    }
    const resultText = formatNumber(result.value);
    setInput(resultText);
    setDisplay(resultText);
  };

  const handlePress = (key) => {
    if (verifying) return;
    if (key === 'AC') return resetCalculator();
    if (key === '⌫') return deleteLast();
    if (key === '%') return applyPercent();
    if (key === '=') return handleEqual();
    if (key === '⇄') return;
    if (isOperator(key)) return appendOperator(key);
    appendDigit(key);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerIcon} onPress={resetCalculator}>
          <Text style={styles.headerIconText}>↺</Text>
        </TouchableOpacity>
        <View style={styles.headerTabs}>
          <Text style={styles.headerTabActive}>计算</Text>
          <Text style={styles.headerTab}>换算</Text>
        </View>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>⋮</Text>
        </View>
      </View>

      <View style={styles.displayArea}>
        <Text style={styles.display} numberOfLines={1} adjustsFontSizeToFit>{display}</Text>
        {verifying && <ActivityIndicator size="small" color="#FF8A00" style={styles.activity} />}
      </View>

      <View style={styles.keypad}>
        {KEYS.map((row) => (
          <View key={row.join('')} style={styles.row}>
            {row.map((key) => {
              const operator = isOperator(key) || key === '=';
              const utility = ['AC', '⌫', '%', '⇄'].includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.72}
                  style={[styles.key, operator && styles.operatorKey, key === '=' && styles.equalKey]}
                  onPress={() => handlePress(key)}
                >
                  <Text style={[styles.keyText, utility && styles.utilityText, operator && styles.operatorText, key === '=' && styles.equalText]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', paddingHorizontal: 16 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerIconText: { color: '#767676', fontSize: 24, fontWeight: '400' },
  headerTabs: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  headerTabActive: { color: '#111111', fontSize: 18, fontWeight: '700' },
  headerTab: { color: '#9A9A9A', fontSize: 18, fontWeight: '600' },
  displayArea: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', paddingBottom: 24, paddingHorizontal: 4 },
  display: { color: '#111111', fontSize: 56, fontWeight: '300', letterSpacing: -1 },
  activity: { marginTop: 10 },
  keypad: { paddingBottom: 18, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  key: { flex: 1, height: 68, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#D8D8D8', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.38, shadowRadius: 8, elevation: 2 },
  operatorKey: { backgroundColor: '#FFF7EF' },
  equalKey: { backgroundColor: '#FF8A00' },
  keyText: { color: '#222222', fontSize: 27, fontWeight: '400' },
  utilityText: { color: '#555555', fontSize: 23, fontWeight: '500' },
  operatorText: { color: '#FF8A00', fontSize: 30, fontWeight: '500' },
  equalText: { color: '#FFFFFF', fontSize: 32, fontWeight: '700' },
});
```

- [ ] **Step 3: Run lint for calculator changes**

Run:

```bash
cd D:/coding/private-calculator-chat && npm run lint
```

Expected: no new lint errors. Existing warnings are acceptable only if they were already present before this task.

- [ ] **Step 4: Manually verify calculator golden path in Expo Go**

Run Expo if it is not already running:

```bash
cd D:/coding/private-calculator-chat && npx expo start --host lan --port 8083
```

Verify on phone:
- The first screen looks like a normal light phone calculator.
- There is no `CASIO`, `PRIVATE`, `SECURE`, chat copy, or `安全验证中` text.
- `1 + 2 =` shows `3`.
- Entering `EXPO_PUBLIC_APP_UNLOCK_PIN` and pressing `=` unlocks the private area.
- Entering a wrong number and pressing `=` does not reveal that chat exists.

- [ ] **Step 5: Commit or checkpoint**

Run:

```bash
cd D:/coding/private-calculator-chat && git status
```

If this is a Git repository:

```bash
git add src/components/Calculator/Calculator.js
git commit -m "feat: redesign calculator entrance"
```

If it is not a Git repository, checkpoint by reporting:

```text
Changed: src/components/Calculator/Calculator.js
Verified: npm run lint; Expo Go calculator unlock/manual arithmetic
```

---

### Task 2: Add Membership Screen Routing

**Files:**
- Modify: `src/utils/constants.js`
- Modify: `src/App.js`
- Create: `src/components/Membership/MembershipPage.js`

- [ ] **Step 1: Add membership screen constant**

Change `src/utils/constants.js` from:

```js
export const SCREENS = {
  CALCULATOR: 'Calculator',
  CHAT_LIST: 'ChatList',
  CHAT_WINDOW: 'ChatWindow',
  CLOUD: 'Cloud',
};
```

to:

```js
export const SCREENS = {
  CALCULATOR: 'Calculator',
  CHAT_LIST: 'ChatList',
  CHAT_WINDOW: 'ChatWindow',
  CLOUD: 'Cloud',
  MEMBERSHIP: 'Membership',
};
```

- [ ] **Step 2: Create membership page component**

Create `src/components/Membership/MembershipPage.js` with:

```js
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Modal } from 'react-native';

const BENEFITS = [
  '计算器入口',
  '双人私密聊天',
  '一键锁定回计算器',
  '后续优先体验无痕云端与暗号联系人',
];

export default function MembershipPage({ onBack }) {
  const [giftVisible, setGiftVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F1E7" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.72} onPress={onBack}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>MEMBERSHIP</Text>
          <Text style={styles.title}>轻语月卡</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.price}>9.9 元/月</Text>
        <Text style={styles.heroCopy}>给你们一个更安心的聊天空间</Text>
        <View style={styles.divider} />
        {BENEFITS.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <View style={styles.benefitDot} />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      <View style={styles.giftCard}>
        <Text style={styles.giftTitle}>赠送 TA 月卡</Text>
        <Text style={styles.giftText}>把这个私密空间送给想一起保护的人。</Text>
        <TouchableOpacity style={styles.giftButton} activeOpacity={0.82} onPress={() => setGiftVisible(true)}>
          <Text style={styles.giftButtonText}>生成赠送邀请</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteText}>当前为 MVP 演示页面，暂不包含真实支付、激活或账号绑定。</Text>
      </View>

      <Modal visible={giftVisible} transparent animationType="fade" onRequestClose={() => setGiftVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>赠送流程预览</Text>
            <Text style={styles.modalCopy}>正式版会在购买后生成邀请码或二维码，对方领取后进入你们的双人私密空间。</Text>
            <View style={styles.inviteBox}>
              <Text style={styles.inviteLabel}>邀请示例</Text>
              <Text style={styles.inviteCode}>QY-TA-990</Text>
            </View>
            <TouchableOpacity style={styles.modalButton} activeOpacity={0.78} onPress={() => setGiftVisible(false)}>
              <Text style={styles.modalButtonText}>我知道了</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F1E7', paddingHorizontal: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 18 },
  backButton: { width: 48, height: 48, borderRadius: 18, backgroundColor: '#FFFDF8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(122,92,73,0.12)' },
  backText: { color: '#3A271F', fontSize: 38, lineHeight: 40, marginTop: -3 },
  kicker: { color: '#A28A7C', fontSize: 11, fontWeight: '900', letterSpacing: 2.2, textAlign: 'center', marginBottom: 5 },
  title: { color: '#3A271F', fontSize: 27, fontWeight: '900', textAlign: 'center' },
  headerSpacer: { width: 48 },
  heroCard: { backgroundColor: '#FFFDF8', borderRadius: 30, padding: 24, borderWidth: 1, borderColor: 'rgba(122,92,73,0.12)', shadowColor: '#5B3E2D', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
  price: { color: '#3A271F', fontSize: 42, fontWeight: '900', letterSpacing: -1, marginBottom: 8 },
  heroCopy: { color: '#7D675D', fontSize: 16, fontWeight: '700', lineHeight: 23 },
  divider: { height: 1, backgroundColor: 'rgba(122,92,73,0.12)', marginVertical: 20 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  benefitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D7B56D', marginRight: 11 },
  benefitText: { color: '#3A271F', fontSize: 16, fontWeight: '700', flex: 1, lineHeight: 22 },
  giftCard: { marginTop: 18, backgroundColor: '#F2DDD4', borderRadius: 26, padding: 22, borderWidth: 1, borderColor: 'rgba(184,101,85,0.16)' },
  giftTitle: { color: '#3A271F', fontSize: 23, fontWeight: '900', marginBottom: 8 },
  giftText: { color: '#74564D', fontSize: 15, lineHeight: 22, marginBottom: 18 },
  giftButton: { minHeight: 52, borderRadius: 18, backgroundColor: '#D7B56D', alignItems: 'center', justifyContent: 'center' },
  giftButtonText: { color: '#3A271F', fontSize: 16, fontWeight: '900' },
  noteCard: { marginTop: 14, padding: 16, borderRadius: 20, backgroundColor: 'rgba(255,253,248,0.62)' },
  noteText: { color: '#8A7468', fontSize: 13, lineHeight: 19 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(58,39,31,0.38)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22 },
  modalCard: { width: '100%', backgroundColor: '#FFFDF8', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: 'rgba(122,92,73,0.12)' },
  modalTitle: { color: '#3A271F', fontSize: 24, fontWeight: '900', marginBottom: 10 },
  modalCopy: { color: '#7D675D', fontSize: 15, lineHeight: 23 },
  inviteBox: { marginTop: 20, marginBottom: 20, borderRadius: 20, padding: 18, alignItems: 'center', backgroundColor: '#FFF7EF', borderWidth: 1, borderColor: 'rgba(215,181,109,0.26)' },
  inviteLabel: { color: '#A28A7C', fontSize: 12, fontWeight: '800', marginBottom: 6 },
  inviteCode: { color: '#3A271F', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  modalButton: { minHeight: 50, borderRadius: 17, backgroundColor: '#3A271F', alignItems: 'center', justifyContent: 'center' },
  modalButtonText: { color: '#FFFDF8', fontSize: 16, fontWeight: '900' },
});
```

- [ ] **Step 3: Wire membership route in `App.js`**

Change the imports at the top of `src/App.js` to include:

```js
import MembershipPage from './components/Membership/MembershipPage';
```

Add this handler after `handleOpenCloud`:

```js
const handleOpenMembership = () => { setCurrentScreen(SCREENS.MEMBERSHIP); };
const handleBackFromMembership = () => { setCurrentScreen(SCREENS.CHAT_LIST); };
```

Change the `ChatList` render from:

```jsx
{currentScreen === SCREENS.CHAT_LIST && <ChatList onLock={handleLock} navigation={{ navigate: handleOpenChat }} onOpenCloud={handleOpenCloud} />}
```

to:

```jsx
{currentScreen === SCREENS.CHAT_LIST && (
  <ChatList
    onLock={handleLock}
    navigation={{ navigate: handleOpenChat }}
    onOpenCloud={handleOpenCloud}
    onOpenMembership={handleOpenMembership}
  />
)}
```

Add the membership screen render after the cloud screen render:

```jsx
{currentScreen === SCREENS.MEMBERSHIP && <MembershipPage onBack={handleBackFromMembership} />}
```

- [ ] **Step 4: Run lint for route changes**

Run:

```bash
cd D:/coding/private-calculator-chat && npm run lint
```

Expected: no new lint errors.

- [ ] **Step 5: Commit or checkpoint**

If this is a Git repository:

```bash
cd D:/coding/private-calculator-chat && git add src/utils/constants.js src/App.js src/components/Membership/MembershipPage.js
git commit -m "feat: add membership demo screen"
```

If it is not a Git repository, checkpoint by reporting:

```text
Changed: src/utils/constants.js, src/App.js
Created: src/components/Membership/MembershipPage.js
Verified: npm run lint
```

---

### Task 3: Make Chat List More WeChat-like and Add Membership Entry

**Files:**
- Modify: `src/components/Chat/ChatList.js`

- [ ] **Step 1: Change component signature to accept membership callback**

Change:

```js
export default function ChatList({ onLock, navigation }) {
```

to:

```js
export default function ChatList({ onLock, navigation, onOpenMembership }) {
```

- [ ] **Step 2: Replace suspicious/premium-English header copy with product-safe Chinese copy**

Change this header block:

```jsx
<View>
  <Text style={styles.eyebrow}>PRIVATE LEDGER</Text>
  <Text style={styles.title}>密谈</Text>
</View>
```

to:

```jsx
<View>
  <Text style={styles.eyebrow}>轻语计算器</Text>
  <Text style={styles.title}>密谈</Text>
</View>
```

Change status copy:

```jsx
<Text style={styles.statusTitle}>本地服务器已连接</Text>
<Text style={styles.statusText}>SQLite · 局域网 · 不上云</Text>
```

to:

```jsx
<Text style={styles.statusTitle}>安心聊天中</Text>
<Text style={styles.statusText}>一键锁定回计算器</Text>
```

Change empty state:

```jsx
<Text style={styles.emptyIcon}>∅</Text>
<Text style={styles.emptyTitle}>暂无联系人</Text>
<Text style={styles.emptyHint}>点击右上角添加第一个加密会话</Text>
```

to:

```jsx
<Text style={styles.emptyIcon}>＋</Text>
<Text style={styles.emptyTitle}>添加第一个联系人</Text>
<Text style={styles.emptyHint}>像微信一样开始一段双人私密聊天</Text>
```

- [ ] **Step 3: Make contact row preview closer to WeChat**

Change:

```jsx
<Text style={styles.time}>LOCAL</Text>
<Text style={styles.preview} numberOfLines={1}>{item.last_message || '暂无消息'}</Text>
```

to:

```jsx
<Text style={styles.time}>刚刚</Text>
<Text style={styles.preview} numberOfLines={1}>{item.last_message || '还没有聊天记录'}</Text>
```

- [ ] **Step 4: Add membership action sheet item**

Insert this action sheet item after the `手机号添加` item and before `锁定并返回计算器`:

```jsx
<TouchableOpacity style={styles.actionSheetItem} onPress={() => { setActionSheetVisible(false); onOpenMembership && onOpenMembership(); }}>
  <View style={styles.actionSheetIconBg}><Text style={styles.actionSheetIcon}>月</Text></View>
  <Text style={styles.actionSheetItemText}>会员权益</Text>
</TouchableOpacity>
```

Expected action sheet order:
1. 我的二维码
2. 扫一扫
3. 手机号添加
4. 会员权益
5. 锁定并返回计算器
6. 取消

- [ ] **Step 5: Tune list styles toward WeChat familiarity without losing soft premium tone**

Update only these style entries in `src/components/Chat/ChatList.js`:

```js
eyebrow: { color: '#A28A7C', fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6 },
statusText: { color: '#8A7468', fontSize: 12, marginTop: 3 },
contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, borderRadius: 18, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: 'rgba(122,92,73,0.10)', shadowColor: '#5B3E2D', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.045, shadowRadius: 12, elevation: 1 },
avatarShell: { width: 54, height: 54, borderRadius: 16, backgroundColor: 'rgba(232,183,170,0.22)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
avatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#E8B7AA', justifyContent: 'center', alignItems: 'center' },
time: { color: '#B29A8E', fontSize: 12, fontWeight: '700' },
preview: { color: '#8A7468', fontSize: 14, lineHeight: 20 },
```

- [ ] **Step 6: Run lint for chat list changes**

Run:

```bash
cd D:/coding/private-calculator-chat && npm run lint
```

Expected: no new lint errors.

- [ ] **Step 7: Manually verify chat list flow in Expo Go**

Verify:
- Chat list title is `密谈` with product-friendly copy.
- Contact rows show avatar, name, preview, and time/status.
- Top-right plus button is easy to tap.
- Action sheet includes `会员权益`.
- Tapping `会员权益` opens the membership page.
- Tapping `锁定` or `锁定并返回计算器` returns immediately to calculator.

- [ ] **Step 8: Commit or checkpoint**

If this is a Git repository:

```bash
cd D:/coding/private-calculator-chat && git add src/components/Chat/ChatList.js
git commit -m "feat: add membership entry to chat list"
```

If it is not a Git repository, checkpoint by reporting:

```text
Changed: src/components/Chat/ChatList.js
Verified: npm run lint; Expo Go chat list/action sheet/manual lock
```

---

### Task 4: Polish Chat Window Copy and WeChat-like Controls

**Files:**
- Modify: `src/components/Chat/ChatWindow.js`

- [ ] **Step 1: Replace technical/private wording in the chat header**

Change:

```jsx
<Text style={styles.subline}>本地私密 · 仅此设备</Text>
```

to:

```jsx
<Text style={styles.subline}>安心聊天中</Text>
```

- [ ] **Step 2: Make the input row feel closer to WeChat**

Change the input placeholder:

```jsx
placeholder="输入密谈内容"
```

to:

```jsx
placeholder="发消息"
```

If the plus panel labels already include `相册` and `拍照`, preserve them. If they do not, make sure the visible labels are exactly:

```jsx
<Text style={styles.panelText}>相册</Text>
<Text style={styles.panelText}>拍照</Text>
```

- [ ] **Step 3: Keep burn-after-read secondary**

Find the burn button style and ensure it stays visually secondary. If the burn button is too visually dominant, use this style:

```js
burnButton: { minWidth: 48, height: 48, borderRadius: 18, backgroundColor: 'rgba(232,183,170,0.16)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(184,101,85,0.10)' },
burnText: { color: '#9A6B62', fontSize: 13, fontWeight: '800' },
```

- [ ] **Step 4: Run lint for chat window changes**

Run:

```bash
cd D:/coding/private-calculator-chat && npm run lint
```

Expected: no new lint errors.

- [ ] **Step 5: Manually verify chat window golden path**

Verify in Expo Go:
- Opening a contact shows a WeChat-like chat window with back button, contact name, and subtle `安心聊天中` status.
- Sending text remains one-step.
- Message bubbles are readable.
- Plus panel opens from the bottom and includes `相册` and `拍照`.
- Long press message menu still opens.
- Burn entry exists but does not dominate the screen.

- [ ] **Step 6: Commit or checkpoint**

If this is a Git repository:

```bash
cd D:/coding/private-calculator-chat && git add src/components/Chat/ChatWindow.js
git commit -m "feat: polish chat window copy"
```

If it is not a Git repository, checkpoint by reporting:

```text
Changed: src/components/Chat/ChatWindow.js
Verified: npm run lint; Expo Go chat send/plus panel/long press
```

---

### Task 5: Full Commercial Demo Verification

**Files:**
- Verify: `src/components/Calculator/Calculator.js`
- Verify: `src/components/Chat/ChatList.js`
- Verify: `src/components/Chat/ChatWindow.js`
- Verify: `src/components/Membership/MembershipPage.js`
- Verify: `src/App.js`
- Verify: `src/utils/constants.js`

- [ ] **Step 1: Run frontend lint**

Run:

```bash
cd D:/coding/private-calculator-chat && npm run lint
```

Expected: no errors. Existing warnings are acceptable only if unrelated to this MVP work.

- [ ] **Step 2: Run backend tests**

Run:

```bash
cd D:/coding/private-calculator-chat && npm test --prefix backend
```

Expected: Jest/Supertest backend tests pass.

- [ ] **Step 3: Run Android export**

Run:

```bash
cd D:/coding/private-calculator-chat && npx expo export --platform android
```

Expected: export completes successfully.

- [ ] **Step 4: Run Web export**

Run:

```bash
cd D:/coding/private-calculator-chat && npx expo export --platform web
```

Expected: export completes successfully. Existing Expo dependency deprecation warnings are acceptable if export succeeds.

- [ ] **Step 5: Verify the 15-second commercial demo flow in Expo Go**

Run Expo if needed:

```bash
cd D:/coding/private-calculator-chat && npx expo start --host lan --port 8083
```

Verify this exact sequence on phone:
1. Open app: it looks like a normal phone calculator.
2. Tap a few calculator keys and calculate `1 + 2 = 3`.
3. Enter `EXPO_PUBLIC_APP_UNLOCK_PIN` and press `=`.
4. Enter private chat list.
5. Open a contact and send a message.
6. Return to chat list, tap lock/stealth, and immediately return to calculator.
7. Unlock again, open action sheet, tap `会员权益`.
8. Membership page shows `轻语月卡`, `9.9 元/月`, and `赠送 TA 月卡`.
9. Tap gifting button and see the demo modal explaining future invite/QR flow.

- [ ] **Step 6: Check MVP scope exclusions**

Confirm the implementation does not add:
- Real payment integration.
- Real cloud storage.
- Anti-screenshot implementation.
- Hidden contacts.
- AI privacy assistant.
- Large account system.
- Extra privacy toggles in the chat header.
- Per-message privacy configuration menus.

- [ ] **Step 7: Commit or final checkpoint**

If this is a Git repository:

```bash
cd D:/coding/private-calculator-chat && git status
git add src/components/Calculator/Calculator.js src/components/Chat/ChatList.js src/components/Chat/ChatWindow.js src/components/Membership/MembershipPage.js src/App.js src/utils/constants.js
git commit -m "feat: build commercial MVP surfaces"
```

If it is not a Git repository, final checkpoint by reporting:

```text
Commercial MVP implementation verified.
Changed: src/components/Calculator/Calculator.js, src/components/Chat/ChatList.js, src/components/Chat/ChatWindow.js, src/App.js, src/utils/constants.js
Created: src/components/Membership/MembershipPage.js
Verified: npm run lint; npm test --prefix backend; npx expo export --platform android; npx expo export --platform web; Expo Go commercial demo flow
```

---

## Self-Review

### Spec coverage

- Xiaomi-style believable calculator entrance: Task 1.
- Preserve PIN unlock and normal calculator behavior: Task 1 manual verification.
- Remove suspicious calculator copy: Task 1 manual verification.
- WeChat-like chat list and window: Tasks 3 and 4.
- Low-friction lock/stealth back to calculator: Task 3 and Task 5 verification.
- Membership/value display with `9.9 元/月`: Task 2.
- Partner/friend gifting demo surface: Task 2 and Task 5.
- No real payment/cloud/anti-screenshot/account system: Task 5 scope exclusion check.
- Commercial video flow: Task 5.

### Placeholder scan

This plan contains no `TBD`, unresolved placeholders, or deferred implementation instructions. All code-bearing steps include concrete code or exact replacements.

### Type and prop consistency

- `SCREENS.MEMBERSHIP` is defined in `src/utils/constants.js` before use in `src/App.js`.
- `MembershipPage` receives `onBack`, and `App.js` provides `handleBackFromMembership`.
- `ChatList` receives `onOpenMembership`, and `App.js` provides `handleOpenMembership`.
- Membership/gifting is UI-only and does not call backend services.
