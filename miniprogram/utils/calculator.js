function safeCalculate(expression) {
  const input = String(expression || '').replace(/\s+/g, '');
  if (!input) {
    return '0';
  }

  if (!/^[0-9+\-*/.]+$/.test(input)) {
    throw new Error('表达式无效');
  }

  const tokens = [];
  let number = '';

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (/[0-9.]/.test(char)) {
      number += char;
      continue;
    }

    if (char === '-' && (i === 0 || /[+\-*/]/.test(input[i - 1]))) {
      number += char;
      continue;
    }

    if (number) {
      tokens.push(number);
      number = '';
    }
    tokens.push(char);
  }

  if (number) {
    tokens.push(number);
  }

  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const output = [];
  const operators = [];

  function applyOperator() {
    const operator = operators.pop();
    const right = Number(output.pop());
    const left = Number(output.pop());
    let result = 0;
    switch (operator) {
      case '+':
        result = left + right;
        break;
      case '-':
        result = left - right;
        break;
      case '*':
        result = left * right;
        break;
      case '/':
        result = right === 0 ? Infinity : left / right;
        break;
      default:
        throw new Error('表达式无效');
    }
    output.push(String(result));
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (/^[0-9.+-]+$/.test(token) && token !== '+' && token !== '-' && token !== '*' && token !== '/') {
      output.push(token);
      continue;
    }

    while (operators.length && precedence[operators[operators.length - 1]] >= precedence[token]) {
      applyOperator();
    }
    operators.push(token);
  }

  while (operators.length) {
    applyOperator();
  }

  const value = Number(output.pop());
  if (!Number.isFinite(value)) {
    throw new Error('计算失败');
  }

  const normalized = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(10)));
  return normalized;
}

module.exports = {
  safeCalculate,
};
