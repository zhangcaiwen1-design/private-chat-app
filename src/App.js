import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import { SCREENS } from './utils/constants';
import Calculator from './components/Calculator/Calculator';
import ChatList from './components/Chat/ChatList';
import ChatWindow from './components/Chat/ChatWindow';
import CloudRecords from './components/Chat/CloudRecords';
import { clearSession } from './services/AuthService';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.CALCULATOR);
  const [currentContact, setCurrentContact] = useState(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active') {
        clearSession();
        setCurrentContact(null);
        setCurrentScreen(SCREENS.CALCULATOR);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleUnlock = () => { setCurrentScreen(SCREENS.CHAT_LIST); };
  const handleLock = () => { setCurrentScreen(SCREENS.CALCULATOR); };
  const handleOpenChat = (contact) => { setCurrentContact(contact); setCurrentScreen(SCREENS.CHAT_WINDOW); };
  const handleBack = () => { setCurrentContact(null); setCurrentScreen(SCREENS.CHAT_LIST); };
  const handleOpenCloud = () => { setCurrentScreen(SCREENS.CLOUD); };
  const handleBackFromCloud = () => { setCurrentScreen(SCREENS.CHAT_LIST); };

  return (
    <View style={styles.container}>
      {currentScreen === SCREENS.CALCULATOR && <Calculator onUnlock={handleUnlock} />}
      {currentScreen === SCREENS.CHAT_LIST && <ChatList onLock={handleLock} navigation={{ navigate: handleOpenChat }} onOpenCloud={handleOpenCloud} />}
      {currentScreen === SCREENS.CHAT_WINDOW && currentContact && <ChatWindow route={{ params: { contact: currentContact } }} onBack={handleBack} />}
      {currentScreen === SCREENS.CLOUD && <CloudRecords onBack={handleBackFromCloud} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});