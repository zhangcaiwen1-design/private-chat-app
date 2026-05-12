const test = require('node:test');
const assert = require('node:assert/strict');
const { formatCalculatorValue, safeEvaluate } = require('../src/utils/calculatorEngine');

test('evaluates addition and subtraction expressions', () => {
  assert.deepEqual(safeEvaluate('12+3-4'), { value: 11 });
});

test('evaluates multiplication and division expressions', () => {
  assert.deepEqual(safeEvaluate('8*2/4'), { value: 4 });
});

test('rejects division by zero', () => {
  assert.equal(safeEvaluate('8/0').error, true);
});

test('formats decimal values without trailing zeros', () => {
  assert.equal(formatCalculatorValue(3.5), '3.5');
  assert.equal(formatCalculatorValue(3), '3');
});
