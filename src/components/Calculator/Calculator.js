import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { PIN } from '../../utils/constants';
import { authenticateWithBiometric } from '../../services/AuthService';

const KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '⌫'],
];

function safeEvaluate(expr) {
  if (!/^[0-9+\-*/.]+$/.test(expr)) return { error: true };
  const tokens = expr.match(/(\d+\.?\d*|[+\-*/])/g);
  if (!tokens) return { error: true };
  let result = parseFloat(tokens[0]);
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const num = parseFloat(tokens[i + 1]);
    if (isNaN(num)) return { error: true };
    switch (op) {
      case '+': result += num; break;
      case '-': result -= num; break;
      case '*': result *= num; break;
      case '/': if (num === 0) return { error: true }; result /= num; break;
      default: return { error: true };
    }
  }
  return { value: result };
}

export default function Calculator({ onUnlock }) {
  const [display, setDisplay] = useState('0');
  const [input, setInput] = useState('');
  const [operator, setOperator] = useState(null);
  const [prevValue, setPrevValue] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const handleNumber = (num) => {
    if (display === '0' && num !== '.') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
    setInput(input + num);
  };

  const handleOperator = (op) => {
    setOperator(op);
    setPrevValue(display);
    setInput('');
  };

  const handleDelete = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setInput('');
    setOperator(null);
    setPrevValue(null);
  };

  const handleEqual = () => {
    if (input === PIN && operator === null) {
      setVerifying(true);
      setDisplay('验证中...');
      authenticateWithBiometric()
        .then(() => {
          setDisplay('0');
          setInput('');
          setVerifying(false);
          onUnlock();
        })
        .catch(() => {
          setVerifying(false);
          setDisplay('验证失败');
          setInput('');
          setTimeout(() => setDisplay('0'), 1500);
        });
      return;
    }
    const result = safeEvaluate(input);
    if (result.error) {
      setDisplay('错误');
      setInput('');
      setTimeout(() => setDisplay('0'), 1000);
    } else {
      const resultStr = String(result.value).includes('.') ? result.value.toFixed(8).replace(/\.?0+$/, '') : String(result.value);
      setDisplay(resultStr);
      setInput(resultStr);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.displayContainer}>
        <Text style={styles.display} numberOfLines={1}>{display}</Text>
      </View>
      {verifying ? (
        <View style={styles.verifyingContainer}>
          <ActivityIndicator size="large" color="#07C160" />
          <Text style={styles.verifyingText}>验证中...</Text>
        </View>
      ) : (
        <View style={styles.keypad}>
          {KEYS.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((key) => (
                <TouchableOpacity key={key} style={[styles.button, key === '0' && styles.buttonZero]} onPress={() => key === '⌫' ? handleDelete() : handleNumber(key)}>
                  <Text style={styles.buttonText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.row}>
            <TouchableOpacity style={styles.buttonGray} onPress={handleClear}><Text style={styles.buttonTextGray}>清空</Text></TouchableOpacity>
            <TouchableOpacity style={styles.buttonGray} onPress={() => handleOperator('+')}><Text style={styles.buttonTextGray}>+</Text></TouchableOpacity>
            <TouchableOpacity style={styles.buttonGray} onPress={() => handleOperator('-')}><Text style={styles.buttonTextGray}>−</Text></TouchableOpacity>
            <TouchableOpacity style={styles.buttonGreen} onPress={handleEqual}><Text style={styles.buttonTextGreen}>=</Text></TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#B8B8B8', justifyContent: 'flex-end' },
  displayContainer: { backgroundColor: '#B8B8B8', paddingHorizontal: 20, paddingVertical: 30, alignItems: 'flex-end' },
  display: { color: '#333333', fontSize: 56, fontWeight: '300' },
  keypad: { backgroundColor: '#B8B8B8', paddingBottom: 28 },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 1 },
  button: { flex: 1, height: 58, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginHorizontal: 0.5 },
  buttonZero: { flex: 2, marginLeft: 1 },
  buttonText: { color: '#333333', fontSize: 24, fontWeight: '400' },
  buttonGray: { flex: 1, height: 58, backgroundColor: '#A8A8A8', justifyContent: 'center', alignItems: 'center', marginHorizontal: 0.5 },
  buttonTextGray: { color: '#FFFFFF', fontSize: 22 },
  buttonGreen: { flex: 1, height: 58, backgroundColor: '#07C160', justifyContent: 'center', alignItems: 'center', marginHorizontal: 0.5 },
  buttonTextGreen: { color: '#FFFFFF', fontSize: 26, fontWeight: '500' },
  verifyingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  verifyingText: { color: '#07C160', fontSize: 16, marginTop: 12, fontWeight: '500' },
});