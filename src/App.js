import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, AppState, Text, TouchableOpacity, Linking, ActivityIndicator, Platform } from 'react-native';
import * as navigationResolver from './utils/resolveAppNavigation';
import { SCREENS } from './utils/constants';
import Calculator from './components/Calculator/Calculator';
import AuthGateway from './components/Auth/AuthGateway';
import ChatList from './components/Chat/ChatList';
import ChatWindow from './components/Chat/ChatWindow';
import CloudRecords from './components/Chat/CloudRecords';
import RitualCenter from './components/Rituals/RitualCenter';
import MembershipCenter from './components/Membership/MembershipCenter';
import PhoneSettings from './components/Settings/PhoneSettings';
import UnlockPinSettings from './components/Settings/UnlockPinSettings';
import { clearKickoutReason, clearSession, getKickoutReason, lockApp, restoreAuthSession, signOut } from './services/AuthService';
import { listConversations } from './services/ChatRepository';
import { fetchAppVersionConfig, shouldForceUpdate } from './services/AppUpdateService';
import { isActiveMembership, refreshMembershipStatus } from './services/MembershipService';
const { shouldLockOnAppBlur, shouldLockToCalculator } = require('./utils/appLockPolicy');

export default function App() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.CALCULATOR);
  const [currentContact, setCurrentContact] = useState(null);
  const [ritualContact, setRitualContact] = useState(null);
  const [chatListRefreshToken, setChatListRefreshToken] = useState(0);
  const [versionCheckDone, setVersionCheckDone] = useState(false);
  const [forceUpdateConfig, setForceUpdateConfig] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [kickoutMessage, setKickoutMessage] = useState('');
  const [membershipGateActive, setMembershipGateActive] = useState(false);
  const appState = useRef(AppState.currentState);

  const showAuthedScreenForMembership = async (session) => {
    let membership = session?.membership || null;
    if (!membership) {
      membership = await refreshMembershipStatus().catch(() => null);
    }

    if (isActiveMembership(membership)) {
      setMembershipGateActive(false);
      setCurrentScreen(SCREENS.CHAT_LIST);
      return;
    }

    setMembershipGateActive(true);
    setCurrentContact(null);
    setRitualContact(null);
    setCurrentScreen(SCREENS.MEMBERSHIP);
  };

  const ensureMembershipAccess = async () => {
    const membership = await refreshMembershipStatus().catch(() => null);
    if (isActiveMembership(membership)) {
      setMembershipGateActive(false);
      return true;
    }

    setMembershipGateActive(true);
    setCurrentContact(null);
    setRitualContact(null);
    setCurrentScreen(SCREENS.MEMBERSHIP);
    return false;
  };

  useEffect(() => {
    let mounted = true;

    if (Platform.OS === 'web') {
      setVersionCheckDone(true);
    } else {
      fetchAppVersionConfig()
        .then((config) => {
          if (!mounted) {
            return;
          }

          if (shouldForceUpdate(config)) {
            setForceUpdateConfig(config);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) {
            setVersionCheckDone(true);
          }
        });
    }

    restoreAuthSession()
      .then(async (session) => {
        if (!mounted) {
          return;
        }
        const reason = await getKickoutReason();
        setKickoutMessage(reason || '');
        if (session) {
          await showAuthedScreenForMembership(session);
        } else {
          setMembershipGateActive(false);
          setCurrentScreen(SCREENS.CALCULATOR);
        }
      })
      .finally(() => {
        if (mounted) {
          setSessionReady(true);
        }
      });

    const lockToCalculator = () => {
      setCurrentContact(null);
      setRitualContact(null);
      setMembershipGateActive(false);
      setCurrentScreen(SCREENS.CALCULATOR);
      clearSession();
    };

    const stateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (shouldLockToCalculator(appState.current, nextAppState)) {
        lockToCalculator();
      }
      appState.current = nextAppState;
    });

    const blurSubscription = Platform.OS === 'web' ? null : AppState.addEventListener('blur', () => {
      if (shouldLockOnAppBlur(appState.current)) {
        lockToCalculator();
      }
    });

    return () => {
      mounted = false;
      stateSubscription.remove();
      blurSubscription?.remove();
    };
  }, []);

  const handleUnlock = async () => {
    const session = await restoreAuthSession();
    const reason = await getKickoutReason();
    setKickoutMessage(reason || '');
    if (session) {
      await showAuthedScreenForMembership(session);
    } else {
      setMembershipGateActive(false);
      setCurrentScreen(SCREENS.AUTH);
    }
  };
  const handleLock = async () => {
    await lockApp();
    setCurrentContact(null);
    setRitualContact(null);
    setMembershipGateActive(false);
    setKickoutMessage('');
    setCurrentScreen(SCREENS.CALCULATOR);
  };
  const handleOpenChat = async (targetOrScreen, params) => {
    if (!(await ensureMembershipAccess())) {
      return;
    }
    const target = navigationResolver.resolveAppNavigationTarget(targetOrScreen, params);
    setCurrentContact(target.contact);
    setCurrentScreen(target.screen);
  };
  const handleBack = () => { setCurrentContact(null); setCurrentScreen(SCREENS.CHAT_LIST); };
  const handleOpenCloud = async () => {
    if (await ensureMembershipAccess()) {
      setCurrentScreen(SCREENS.CLOUD);
    }
  };
  const handleBackFromCloud = () => { setCurrentScreen(SCREENS.CHAT_LIST); };
  const handleOpenMembership = () => {
    setMembershipGateActive(false);
    setCurrentScreen(SCREENS.MEMBERSHIP);
  };
  const handleBackFromMembership = () => {
    if (membershipGateActive) {
      setCurrentScreen(SCREENS.CALCULATOR);
      return;
    }
    setCurrentScreen(SCREENS.CHAT_LIST);
  };
  const handleMembershipActive = () => {
    setMembershipGateActive(false);
    setCurrentScreen(SCREENS.CHAT_LIST);
    setChatListRefreshToken((value) => value + 1);
  };
  const handleSwitchMembershipAccount = async () => {
    await signOut();
    setCurrentContact(null);
    setRitualContact(null);
    setMembershipGateActive(false);
    setCurrentScreen(SCREENS.AUTH);
  };
  const handleOpenPhoneSettings = async () => {
    if (await ensureMembershipAccess()) {
      setCurrentScreen(SCREENS.PHONE_SETTINGS);
    }
  };
  const handleBackFromPhoneSettings = () => { setCurrentScreen(SCREENS.CHAT_LIST); };
  const handleOpenUnlockPinSettings = async () => {
    if (await ensureMembershipAccess()) {
      setCurrentScreen(SCREENS.UNLOCK_PIN_SETTINGS);
    }
  };
  const handleBackFromUnlockPinSettings = () => { setCurrentScreen(SCREENS.CHAT_LIST); };
  const handleOpenRituals = async (contact) => {
    if (!(await ensureMembershipAccess())) {
      return;
    }
    setRitualContact(contact);
    setCurrentScreen(SCREENS.RITUALS);
  };
  const handleBackFromRituals = () => {
    setRitualContact(null);
    setCurrentScreen(SCREENS.CHAT_LIST);
  };
  const handleRestoreToLocal = async (payload) => {
    setChatListRefreshToken((value) => value + 1);
    if (!payload?.contactId) {
      setCurrentContact(null);
      setCurrentScreen(SCREENS.CHAT_LIST);
      return;
    }

    try {
      const contacts = await listConversations();
      const restoredContact = contacts.find((item) => item.id === payload.contactId);
      setCurrentContact(restoredContact || {
        id: payload.contactId,
        conversationId: payload.conversationId,
        name: payload.contactName || '已恢复会话',
      });
      setCurrentScreen(SCREENS.CHAT_WINDOW);
    } catch {
      setCurrentContact({
        id: payload.contactId,
        conversationId: payload.conversationId,
        name: payload.contactName || '已恢复会话',
      });
      setCurrentScreen(SCREENS.CHAT_WINDOW);
    }
  };

  const handleOpenUpdateUrl = () => {
    if (forceUpdateConfig?.downloadUrl) {
      Linking.openURL(forceUpdateConfig.downloadUrl).catch(() => {});
    }
  };

  const handleAuthed = async (session) => {
    await clearKickoutReason();
    setKickoutMessage('');
    await showAuthedScreenForMembership(session);
    setChatListRefreshToken((value) => value + 1);
  };

  if (!versionCheckDone || !sessionReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9F0A" />
        <Text style={styles.loadingText}>检查版本中...</Text>
      </View>
    );
  }

  if (forceUpdateConfig) {
    return (
      <View style={styles.updateContainer}>
        <View style={styles.updateCard}>
          <Text style={styles.updateTitle}>{forceUpdateConfig.title}</Text>
          <Text style={styles.updateMessage}>{forceUpdateConfig.message}</Text>
          <TouchableOpacity style={styles.updateButton} onPress={handleOpenUpdateUrl}>
            <Text style={styles.updateButtonText}>立即更新</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentScreen === SCREENS.CALCULATOR && <Calculator onUnlock={handleUnlock} kickoutMessage={kickoutMessage} />}
      {currentScreen === SCREENS.AUTH && <AuthGateway onAuthed={handleAuthed} />}
      {currentScreen === SCREENS.CHAT_LIST && <ChatList onLock={handleLock} navigation={{ navigate: handleOpenChat }} onOpenCloud={handleOpenCloud} onOpenRituals={handleOpenRituals} onOpenMembership={handleOpenMembership} onOpenPhoneSettings={handleOpenPhoneSettings} onOpenUnlockPinSettings={handleOpenUnlockPinSettings} refreshToken={chatListRefreshToken} />}
      {currentScreen === SCREENS.PHONE_SETTINGS && <PhoneSettings onBack={handleBackFromPhoneSettings} onLock={handleLock} />}
      {currentScreen === SCREENS.CHAT_WINDOW && currentContact && <ChatWindow route={{ params: { contact: currentContact } }} onBack={handleBack} onLock={handleLock} />}
      {currentScreen === SCREENS.CLOUD && <CloudRecords onBack={handleBackFromCloud} onLock={handleLock} onRestoreToLocal={handleRestoreToLocal} onOpenMembership={handleOpenMembership} />}
      {currentScreen === SCREENS.MEMBERSHIP && <MembershipCenter onBack={handleBackFromMembership} onLock={handleLock} onMembershipActive={handleMembershipActive} onSwitchAccount={handleSwitchMembershipAccount} isRequired={membershipGateActive} />}
      {currentScreen === SCREENS.UNLOCK_PIN_SETTINGS && <UnlockPinSettings onBack={handleBackFromUnlockPinSettings} onLock={handleLock} />}
      {currentScreen === SCREENS.RITUALS && ritualContact && <RitualCenter contact={ritualContact} onBack={handleBackFromRituals} onLock={handleLock} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#FFFFFF', fontSize: 16 },
  updateContainer: { flex: 1, backgroundColor: '#0B0B0D', justifyContent: 'center', alignItems: 'center', padding: 24 },
  updateCard: { width: '100%', maxWidth: 360, backgroundColor: '#17171C', borderRadius: 24, padding: 24 },
  updateTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  updateMessage: { color: '#D1D5DB', fontSize: 15, lineHeight: 24, marginBottom: 20 },
  updateButton: { minHeight: 48, borderRadius: 16, backgroundColor: '#FF9F0A', justifyContent: 'center', alignItems: 'center' },
  updateButtonText: { color: '#111111', fontSize: 16, fontWeight: '700' },
});
