import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getUserUnlockPin } from '../../services/UserService';
import { authenticateWithBiometric } from '../../services/AuthService';
const { formatCalculatorValue, safeEvaluate } = require('../../utils/calculatorEngine');

export default function Calculator({ onUnlock, kickoutMessage = '' }) {
  const [display, setDisplay] = useState('0');
  const [input, setInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const updateDisplay = (nextInput) => {
    setInput(nextInput);
    setDisplay(nextInput || '0');
  };

  const handleNumber = (num) => {
    const nextInput = input === '0' && num !== '.' ? num : `${input}${num}`;
    updateDisplay(nextInput);
  };

  const handleDecimal = () => {
    const parts = input.split(/[+\-*/]/);
    const currentPart = parts[parts.length - 1] || '';
    if (currentPart.includes('.')) {
      return;
    }

    if (!input || /[+\-*/]$/.test(input)) {
      updateDisplay(`${input}0.`);
      return;
    }

    updateDisplay(`${input}.`);
  };

  const handleOperator = (op) => {
    if (!input) {
      return;
    }

    if (/[+\-*/.]$/.test(input)) {
      updateDisplay(`${input.slice(0, -1)}${op}`);
      return;
    }

    updateDisplay(`${input}${op}`);
  };

  const handlePercent = () => {
    if (!input) {
      return;
    }

    const result = safeEvaluate(input);
    if (result.error) {
      setDisplay('错误');
      setInput('');
      setTimeout(() => setDisplay('0'), 1000);
      return;
    }

    const percentValue = result.value / 100;
    const resultStr = formatCalculatorValue(percentValue);
    updateDisplay(resultStr);
  };

  const handleBackspace = () => {
    if (!input) {
      return;
    }

    const nextInput = input.slice(0, -1);
    updateDisplay(nextInput);
  };

  const handleClear = () => {
    setDisplay('0');
    setInput('');
  };

  const handleEqual = async () => {
    if (verifying) {
      return;
    }

    const entered = input.trim();
    const unlockPin = await getUserUnlockPin().catch(() => '');

    if (unlockPin && entered === unlockPin) {
      setVerifying(true);
      setDisplay('验证中...');
      try {
        await authenticateWithBiometric();
        setDisplay('0');
        setInput('');
        setVerifying(false);
        await onUnlock?.();
      } catch {
        setVerifying(false);
        setDisplay('验证失败');
        setInput('');
        setTimeout(() => setDisplay('0'), 1500);
      }
      return;
    }

    const result = safeEvaluate(input);
    if (result.error) {
      setDisplay('错误');
      setInput('');
      setTimeout(() => setDisplay('0'), 1000);
      return;
    }

    const resultStr = formatCalculatorValue(result.value);
    updateDisplay(resultStr);
  };

  const utilityClearLabel = input ? 'C' : 'AC';

  const rows = [
    [
      { label: utilityClearLabel, type: 'utility', onPress: handleClear },
      { label: '⌫', type: 'utility', onPress: handleBackspace },
      { label: '%', type: 'utility', onPress: handlePercent },
      { label: '÷', type: 'operator', onPress: () => handleOperator('/') },
    ],
    [
      { label: '7', type: 'number', onPress: () => handleNumber('7') },
      { label: '8', type: 'number', onPress: () => handleNumber('8') },
      { label: '9', type: 'number', onPress: () => handleNumber('9') },
      { label: '×', type: 'operator', onPress: () => handleOperator('*') },
    ],
    [
      { label: '4', type: 'number', onPress: () => handleNumber('4') },
      { label: '5', type: 'number', onPress: () => handleNumber('5') },
      { label: '6', type: 'number', onPress: () => handleNumber('6') },
      { label: '−', type: 'operator', onPress: () => handleOperator('-') },
    ],
    [
      { label: '1', type: 'number', onPress: () => handleNumber('1') },
      { label: '2', type: 'number', onPress: () => handleNumber('2') },
      { label: '3', type: 'number', onPress: () => handleNumber('3') },
      { label: '+', type: 'operator', onPress: () => handleOperator('+') },
    ],
    [
      { label: '0', type: 'numberWide', onPress: () => handleNumber('0') },
      { label: '.', type: 'number', onPress: handleDecimal },
      { label: '=', type: 'equal', onPress: handleEqual },
    ],
  ];

  const getButtonStyle = (type) => {
    if (type === 'utility') return styles.utilityButton;
    if (type === 'operator') return styles.operatorButton;
    if (type === 'equal') return styles.equalButton;
    if (type === 'numberWide') return styles.numberButtonWide;
    return styles.numberButton;
  };

  const getButtonTextStyle = (type) => {
    if (type === 'utility') return styles.utilityText;
    if (type === 'operator') return styles.operatorText;
    if (type === 'equal') return styles.equalText;
    return styles.numberText;
  };

  return (
    <View style={styles.container}>
      <View style={styles.shell}>
        <View style={styles.displayBlock}>
          {kickoutMessage ? <Text style={styles.kickoutText}>{kickoutMessage}</Text> : null}
          <Text style={styles.display} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.45}>{display}</Text>
        </View>
        {verifying ? (
          <View style={styles.verifyingContainer}>
            <ActivityIndicator size="large" color="#FF9F0A" />
            <Text style={styles.verifyingText}>验证中</Text>
          </View>
        ) : (
          <View style={styles.keypad}>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    activeOpacity={0.82}
                    style={[styles.baseButton, getButtonStyle(item.type)]}
                    onPress={item.onPress}
                  >
                    <Text style={getButtonTextStyle(item.type)}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'flex-end' },
  shell: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 18 },
  displayBlock: { minHeight: 204, justifyContent: 'flex-end', alignItems: 'flex-end', paddingHorizontal: 10, paddingBottom: 12 },
  kickoutText: { color: '#FF9F0A', fontSize: 14, marginBottom: 16, textAlign: 'right' },
  display: { color: '#FFFFFF', fontSize: 86, fontWeight: '200', letterSpacing: -2.2 },
  keypad: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  baseButton: { height: 78, borderRadius: 39, justifyContent: 'center', alignItems: 'center' },
  utilityButton: { flex: 1, backgroundColor: '#A5A5A5' },
  operatorButton: { flex: 1, backgroundColor: '#FF9F0A' },
  equalButton: { flex: 1, backgroundColor: '#FF9F0A' },
  numberButton: { flex: 1, backgroundColor: '#333333' },
  numberButtonWide: { flex: 2, backgroundColor: '#333333', alignItems: 'flex-start', paddingLeft: 30 },
  utilityText: { color: '#000000', fontSize: 28, fontWeight: '400' },
  operatorText: { color: '#FFFFFF', fontSize: 34, fontWeight: '300' },
  equalText: { color: '#FFFFFF', fontSize: 34, fontWeight: '300' },
  numberText: { color: '#FFFFFF', fontSize: 34, fontWeight: '300' },
  verifyingContainer: { height: 420, justifyContent: 'center', alignItems: 'center' },
  verifyingText: { color: '#FF9F0A', fontSize: 16, fontWeight: '600', marginTop: 14 },
});
