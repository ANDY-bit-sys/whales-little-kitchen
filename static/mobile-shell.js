/* Phone layout, gesture-driven fullscreen and honest browser fallbacks. */
(() => {
  'use strict';
  const canvas = document.getElementById('canvas');
  const stage = document.getElementById('game-stage');
  const mobile = navigator.maxTouchPoints > 0 &&
    (matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/.test(navigator.userAgent));
  const standalone = () => navigator.standalone === true ||
    matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
  const fullscreen = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  const state = { mobile, started: false, fullscreen: false, standalone: standalone(), portrait: false, orientationLocked: false };
  let pendingStart = null, frame = 0, requesting = false, locking = false;
  window.__restaurantMobile = state;
  window.__restaurantMobileBlocked = false;
  const rotate = document.getElementById('rotate-guide');
  const fullscreenButton = document.getElementById('mobile-fullscreen');
  const help = document.getElementById('mobile-help');
  const helpButton = document.getElementById('mobile-help-open');
  const hint = document.getElementById('mobile-start-note');
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const supported = () => Boolean((stage.requestFullscreen && document.fullscreenEnabled !== false) ||
    (stage.webkitRequestFullscreen && document.webkitFullscreenEnabled !== false));
  function helpText() {
    return ios ? '在 Safari 点“分享” → “添加到主屏幕”，再从桌面图标打开，即可隐藏浏览器地址栏。横过手机来玩吧。'
      : '请用手机浏览器打开。也可以在浏览器菜单选择“添加到主屏幕”或“安装应用”，再从桌面图标进入。';
  }
  function updateHint(message) {
    hint.textContent = message || (standalone() ? '横过手机，拖动食材开始经营。'
      : supported() ? '点“走进小饭馆”进入横屏全屏。' : helpText());
  }
  function layout() {
    frame = 0;
    if (!mobile) return;
    const box = stage.getBoundingClientRect(), styles = getComputedStyle(stage);
    const left = parseFloat(styles.paddingLeft) || 0, right = parseFloat(styles.paddingRight) || 0;
    const top = parseFloat(styles.paddingTop) || 0, bottom = parseFloat(styles.paddingBottom) || 0;
    const width = Math.max(1, box.width - left - right), height = Math.max(1, box.height - top - bottom);
    const fit = Math.min(width / 1440, height / 900);
    canvas.style.width = `${1440 * fit}px`;
    canvas.style.height = `${900 * fit}px`;
    state.portrait = box.height > box.width;
    state.fullscreen = fullscreen(); state.standalone = standalone();
    const blocked = state.portrait && (state.started || pendingStart !== null);
    window.__restaurantMobileBlocked = blocked || !help.hidden;
    rotate.hidden = !blocked;
    fullscreenButton.hidden = !state.started || state.fullscreen || state.standalone;
    helpButton.hidden = !state.started || state.fullscreen || state.standalone;
    if (pendingStart && !state.portrait) {
      const callback = pendingStart; pendingStart = null; callback();
      state.started = true; schedule();
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(layout); }
  async function lockLandscape() {
    if (!mobile || !screen.orientation?.lock || locking) return;
    locking = true;
    try { await screen.orientation.lock('landscape'); state.orientationLocked = true; }
    catch (_) { state.orientationLocked = false; }
    finally { locking = false; }
    schedule();
  }
  async function enterFullscreen() {
    if (!mobile || requesting) return;
    requesting = true;
    try {
      if (standalone() || fullscreen()) { await lockLandscape(); return; }
      // Invoke directly inside the click gesture; never wait for engine/network first.
      if (stage.requestFullscreen && document.fullscreenEnabled !== false) await stage.requestFullscreen({ navigationUI: 'hide' });
      else if (stage.webkitRequestFullscreen && document.webkitFullscreenEnabled !== false) await stage.webkitRequestFullscreen();
      else { updateHint(helpText()); return; }
      await lockLandscape();
    } catch (_) {
      updateHint('浏览器暂时没有进入全屏；仍可横屏游玩，或添加到主屏幕后打开。');
      if (state.started) openHelp();
    } finally { requesting = false; schedule(); }
  }
  function begin(callback) {
    if (!mobile) { callback(); return; }
    if (state.started || pendingStart) return;
    pendingStart = callback;
    // No await here: requestFullscreen must retain the trusted tap activation.
    void enterFullscreen(); layout();
  }
  function openHelp() { help.hidden = false; document.getElementById('mobile-help-copy').textContent = helpText(); layout(); }
  function closeHelp() { help.hidden = true; layout(); canvas.focus({ preventScroll: true }); }
  fullscreenButton.addEventListener('click', () => { if (!supported() && !standalone()) openHelp(); else void enterFullscreen(); });
  document.getElementById('rotate-fullscreen').addEventListener('click', () => { if (!supported() && !standalone()) openHelp(); else void enterFullscreen(); });
  helpButton.addEventListener('click', openHelp);
  document.getElementById('mobile-help-close').addEventListener('click', closeHelp);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !help.hidden) { closeHelp(); event.stopImmediatePropagation(); } }, true);
  for (const event of ['resize', 'orientationchange', 'pageshow']) window.addEventListener(event, schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  screen.orientation?.addEventListener('change', schedule);
  for (const event of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(event, () => {
    if (fullscreen()) void lockLandscape();
    else { state.orientationLocked = false; try { screen.orientation?.unlock?.(); } catch (_) {} }
    schedule();
  });
  if (mobile) {
    document.body.dataset.mobile = 'true';
    canvas.width = 1440; canvas.height = 900;
    hint.hidden = false; updateHint(); layout();
    if (!supported()) document.getElementById('rotate-fullscreen').textContent = '全屏游玩方法';
    document.querySelector('.small').innerHTML = '用手指拖放食材<br>你来配料，豆包掌勺，大肥鱼把热饭送到客人桌上。';
    new ResizeObserver(schedule).observe(stage);
  }
  window.restaurantMobile = { mobile, begin, enterFullscreen, layout };
})();
