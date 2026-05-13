function getScreenLayout() {
  let system = {};
  try {
    system = wx.getSystemInfoSync() || {};
  } catch (error) {
    system = {};
  }

  let menu = null;
  try {
    menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
  } catch (error) {
    menu = null;
  }

  const statusBarHeight = Number(system.statusBarHeight || 0);
  const screenWidth = Number(system.screenWidth || system.windowWidth || 375);
  const safeBottom = system.safeArea && system.screenHeight
    ? Math.max(0, Number(system.screenHeight) - Number(system.safeArea.bottom || system.screenHeight))
    : 0;
  const menuTop = menu && menu.top ? Number(menu.top) : statusBarHeight + 8;
  const menuHeight = menu && menu.height ? Number(menu.height) : 32;
  const menuBottom = menu && menu.bottom ? Number(menu.bottom) : menuTop + menuHeight;
  const menuLeft = menu && menu.left ? Number(menu.left) : screenWidth;
  const navRightPadding = Math.max(12, screenWidth - menuLeft + 8);
  const navTop = Math.max(statusBarHeight + 4, menuTop);
  const navHeight = Math.max(32, menuHeight);

  return {
    navTop: navTop,
    navHeight: navHeight,
    navRightPadding: navRightPadding,
    headerHeight: navTop + navHeight + 10,
    safeTop: Math.max(menuBottom + 8, statusBarHeight + 52),
    safeBottom: Math.max(safeBottom, 0),
  };
}

module.exports = {
  getScreenLayout,
};
