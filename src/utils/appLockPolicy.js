function shouldLockToCalculator(previousAppState, nextAppState) {
  return previousAppState === 'active' && (nextAppState === 'inactive' || nextAppState === 'background');
}

module.exports = { shouldLockToCalculator };
