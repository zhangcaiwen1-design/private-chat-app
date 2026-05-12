function shouldLockToCalculator(previousAppState, nextAppState) {
  return previousAppState === 'active' && (nextAppState === 'inactive' || nextAppState === 'background');
}

function shouldLockOnAppBlur(currentAppState) {
  return currentAppState === 'active';
}

module.exports = { shouldLockToCalculator, shouldLockOnAppBlur };
