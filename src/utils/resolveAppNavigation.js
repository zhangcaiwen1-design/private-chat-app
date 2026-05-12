function resolveAppNavigationTarget(targetOrScreen, params) {
  if (typeof targetOrScreen === 'string') {
    return {
      screen: targetOrScreen,
      contact: params?.contact || null,
    };
  }

  return {
    screen: 'ChatWindow',
    contact: targetOrScreen || null,
  };
}

module.exports = { resolveAppNavigationTarget };
