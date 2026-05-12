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

function formatCalculatorValue(value) {
  return String(value).includes('.') ? value.toFixed(8).replace(/\.?0+$/, '') : String(value);
}

module.exports = {
  safeEvaluate,
  formatCalculatorValue,
};
