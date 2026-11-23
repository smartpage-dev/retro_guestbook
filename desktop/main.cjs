'use strict';
const { app, BrowserWindow, session, protocol, ipcMain, dialog, shell, Menu, powerSaveBlocker, powerMonitor } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const S = require('./security.cjs');
const { loadAssets } = require('./assets.cjs');

// CI-only smoke mode uses a disposable profile, never the real operator profile.
const selfTest = process.env.RETROBOOTH_CI_SMOKE === '1' && process.env.CI === 'true';
const profile = selfTest ? fs.mkdtempSync(path.join(os.tmpdir(), 'retrobooth-smoke-')) : path.join(app.getPath('appData'), 'Luce RetroBooth');
fs.mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
app.setPath('sessionData', path.join(profile, 'Chromium'));
fs.mkdirSync(app.getPath('sessionData'), { recursive: true });
app.setAppUserModelId('studio.luce.retrobooth.desktop');
app.enableSandbox();
protocol.registerSchemesAsPrivileged([{ scheme: 'retrobooth', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
if (selfTest) { app.commandLine.appendSwitch('use-fake-device-for-media-stream'); }
let win, ses, cfg, approving = false, closing = false, quitting = false, mediaAllowed = false, mediaPrompt = null, sleepBlock;
let firstRun = false;
const activeDownloads = new Set();
const smokeDownloads = [];
const cfgPath = path.join(profile, 'desktop-settings.json');
function writeConfig(next) {
  const tmp = cfgPath + '.tmp-' + crypto.randomBytes(6).toString('hex');
  let fd;
  try {
    fd = fs.openSync(tmp, 'wx', 0o600); fs.writeFileSync(fd, JSON.stringify(next, null, 2) + '\n'); fs.fsyncSync(fd); fs.closeSync(fd); fd = null;
    fs.renameSync(tmp, cfgPath); cfg = next;
  } finally { if (fd != null) fs.closeSync(fd); if (fs.existsSync(tmp)) fs.unlinkSync(tmp); }
}
function readConfig() {
  if (!fs.existsSync(cfgPath)) { firstRun = true; writeConfig({ schema: 1, cloudOrigin: '' }); return; }
  const next = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  if (next.schema !== 1 || typeof next.cloudOrigin !== 'string' || (next.cloudOrigin && S.cloudOrigin(next.cloudOrigin) !== next.cloudOrigin)) throw new Error('Desktop settings are invalid. The local recording profile has NOT been reset. Restore the settings from a verified backup.');
  cfg = next;
}
function trustedWindow(wc) { return !!win && !win.isDestroyed() && wc === win.webContents && S.isEntry(wc.getURL()); }
async function status() {
  if (!win || win.isDestroyed()) return null;
  return Promise.race([
    win.webContents.executeJavaScript('window.RetroApp ? ({state:RetroApp.status.state,view:RetroApp.status.view,pending:RetroApp.status.pending,ready:RetroApp.status.ready}) : null').catch(() => null),
    new Promise(resolve => setTimeout(() => resolve(null), 1500))
  ]);
}
async function staffOnly(event) {
  if (!S.trustedIPC(event, win)) throw new Error('Untrusted desktop request.');
  const s = await status();
  if (!s || !s.ready || s.state !== 'idle' || s.view !== 'admin') throw new Error('Use Control room after the current session finishes.');
}
function safeSend(channel, payload) { if (win && !win.isDestroyed()) win.webContents.send(channel, payload); }
function bindIPC() {
  ipcMain.handle('retro:info', event => {
    if (!S.trustedIPC(event, win)) throw new Error('Untrusted desktop request.');
    return { version: app.getVersion(), arch: process.arch, platform: process.platform, origin: S.APP_ORIGIN, cloudOrigin: cfg.cloudOrigin, printer: 'not-implemented-on-windows' };
  });
  ipcMain.handle('retro:cloud', async (event, value) => {
    await staffOnly(event); const origin = S.cloudOrigin(value);
    if (origin === cfg.cloudOrigin) return { origin };
    if (approving) throw new Error('Another server approval is open.');
    approving = true;
    try {
      const answer = await dialog.showMessageBox(win, { type: 'question', title: 'Allow this cloud server?', message: origin,
        detail: 'This permits the bundled booth to send private recordings and device credentials to /api/ on this HTTPS server. Verify this is your own deployment. Changing servers blocks outstanding requests to the previous server; finish its pending uploads first.',
        buttons: ['Cancel', 'Allow this server'], defaultId: 0, cancelId: 0, noLink: true });
      if (answer.response !== 1 || !S.trustedIPC(event, win)) throw new Error('Cloud server was not approved.');
      writeConfig({ ...cfg, cloudOrigin: origin }); return { origin };
    } finally { approving = false; }
  });
  ipcMain.handle('retro:fullscreen', async event => { await staffOnly(event); win.setFullScreen(!win.isFullScreen()); return win.isFullScreen(); });
  ipcMain.handle('retro:storage', async event => {
    await staffOnly(event);
    const answer = await dialog.showMessageBox(win, { type: 'info', title: 'Local recording profile', message: profile,
      detail: 'Use Tape library to export playable recordings. Do not delete or copy this live Chromium database as a backup. Installed and portable editions share this profile for this Windows account. Copying the EXE does not copy these recordings.',
      buttons: ['Close', 'Open folder'], defaultId: 0, cancelId: 0, noLink: true });
    if (answer.response === 1 && S.trustedIPC(event, win)) { const error = await shell.openPath(profile); if (error) throw new Error('Could not open the profile folder.'); }
  });
}
function bindPermissions() {
  const local = (wc, url, details) => trustedWindow(wc) && S.isAppURL(url) && details?.isMainFrame !== false;
  ses.setPermissionCheckHandler((wc, permission, origin, details) => {
    if (!local(wc, origin, details)) return false;
    if (permission === 'media') return mediaAllowed;
    return ['fullscreen','persistent-storage','screen-wake-lock'].includes(permission);
  });
  ses.setPermissionRequestHandler(async (wc, permission, callback, details) => {
    const allowed = local(wc, details?.requestingUrl || wc?.getURL(), details);
    if (!allowed) return callback(false);
    if (['fullscreen','persistent-storage','screen-wake-lock'].includes(permission)) return callback(true);
    if (permission !== 'media' || !Array.isArray(details?.mediaTypes) || !details.mediaTypes.length || details.mediaTypes.some(x => !['audio','video'].includes(x))) return callback(false);
    if (mediaAllowed) return callback(true);
    if (selfTest) { mediaAllowed = true; return callback(true); }
    if (!mediaPrompt) mediaPrompt = dialog.showMessageBox(win, { type: 'question', title: 'Camera and microphone', message: 'Allow RetroBooth to use your camera and microphone for this app session?',
      detail: 'Windows privacy settings must also allow desktop camera and microphone access. Only the packaged booth can request this access.',
      buttons: ['Do not allow', 'Allow camera + microphone'], defaultId: 0, cancelId: 0, noLink: true }).then(result => result.response === 1).catch(() => false);
    const accepted = await mediaPrompt; mediaPrompt = null; mediaAllowed = accepted && trustedWindow(wc);
    callback(mediaAllowed);
  });
  ses.setDevicePermissionHandler(() => false);
  ses.setDisplayMediaRequestHandler((_request, callback) => callback({}));
}
function bindDownloads() {
  ses.on('will-download', (event, item, wc) => {
    let name;
    try {
      const source = typeof item.getInitiatorOrigin === 'function' ? item.getInitiatorOrigin() : '';
      if (!trustedWindow(wc) || !item.getURL().startsWith('blob:' + S.APP_ORIGIN + '/') || (source && source !== S.APP_ORIGIN) || activeDownloads.size) throw new Error('Untrusted or overlapping export.');
      name = S.suggestedName(item.getFilename());
      if (item.getTotalBytes() > 256 * 1024 * 1024) throw new Error('Export is larger than the desktop safety limit.');
    } catch { event.preventDefault(); safeSend('retro:export', { state: 'interrupted' }); return; }
    activeDownloads.add(item);
    if (selfTest) { const destination = path.join(profile, name); item.setSavePath(destination); }
    else item.setSaveDialogOptions({ title: 'Export an independent copy', defaultPath: path.join(app.getPath('videos'), name), buttonLabel: 'Save copy', properties: ['showOverwriteConfirmation', 'createDirectory'] });
    item.on('updated', () => { if (item.getReceivedBytes() > 256 * 1024 * 1024) item.cancel(); });
    item.once('done', (_event, state) => {
      activeDownloads.delete(item);
      if (selfTest) smokeDownloads.push({ state, name, bytes: item.getReceivedBytes(), path: item.getSavePath() });
      safeSend('retro:export', { state });
    });
  });
}
async function closeRequested(event) {
  if (quitting || selfTest) return;
  event.preventDefault(); if (closing) return; closing = true;
  try {
    const current = await status(); const busy = !current || current.state !== 'idle' || current.pending || activeDownloads.size > 0;
    const answer = await dialog.showMessageBox(win, { type: busy ? 'warning' : 'question', title: 'Close RetroBooth?',
      message: busy ? 'A recording, save, export or unknown session may still be active.' : 'Close the booth on this device?',
      detail: busy ? 'Closing now can lose the unfinished recording or interrupt its export. Stay open until it finishes. Previously committed recordings are not intentionally deleted.' : 'Pending uploads only continue while the app is open and idle. Saved recordings stay in this Windows account; they are not included in the EXE.',
      buttons: ['Keep open', busy ? 'Close anyway' : 'Close'], defaultId: 0, cancelId: 0, noLink: true });
    if (answer.response === 1 && win && !win.isDestroyed()) { quitting = true; ses.flushStorageData(); win.destroy(); app.quit(); }
  } finally { closing = false; }
}
async function boot() {
  readConfig(); ses = session.fromPartition('persist:retrobooth', { cache: false });
  const assets = loadAssets(path.join(__dirname, 'web'));
  await ses.protocol.handle('retrobooth', assets);
  // TLS certificate checks and CORS remain enabled. Only one approved cloud host is allowed.
  ses.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !S.networkAllowed(details.url, cfg.cloudOrigin) }));
  win = new BrowserWindow({ width: 1440, height: 900, minWidth: 800, minHeight: 500, show: false, backgroundColor: '#18231b', icon: path.join(__dirname, 'resources/icon.ico'),
    title: 'RetroBooth - development alpha', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), session: ses, sandbox: true, contextIsolation: true, nodeIntegration: false, nodeIntegrationInWorker: false, nodeIntegrationInSubFrames: false, webSecurity: true, webviewTag: false, allowRunningInsecureContent: false, spellcheck: false, backgroundThrottling: false, devTools: !app.isPackaged }
  });
  Menu.setApplicationMenu(null); bindIPC(); bindPermissions(); bindDownloads();
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  win.webContents.on('will-navigate', event => { if (!S.isEntry(event.url)) event.preventDefault(); });
  win.webContents.on('will-redirect', event => event.preventDefault());
  win.webContents.on('will-frame-navigate', event => { if (!event.isMainFrame || !S.isEntry(event.url)) event.preventDefault(); });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (S.guestURL(url, cfg.cloudOrigin)) void dialog.showMessageBox(win, { type: 'question', title: 'Open a private guest link?', message: 'Open this link in your system browser?', detail: 'The private owner link can manage or delete this recording. Do not share it publicly. No remote website is loaded inside RetroBooth.', buttons: ['Cancel', 'Open in browser'], defaultId: 0, cancelId: 0, noLink: true }).then(result => { if (result.response === 1 && S.guestURL(url, cfg.cloudOrigin)) return shell.openExternal(url); }).catch(() => {});
    return { action: 'deny' };
  });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { event.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
    if (input.key === 'F5' || ((input.control || input.meta) && input.key.toLowerCase() === 'r')) event.preventDefault();
  });
  win.on('close', closeRequested);
  win.webContents.on('render-process-gone', () => { void dialog.showMessageBox(win, { type: 'error', message: 'The recording screen stopped.', detail: 'An unfinished recording may be lost. Previously saved data has not been reset. Close and reopen the app, then inspect Tape library before continuing.' }); });
  win.on('closed', () => { win = null; });
  powerMonitor.on('suspend', () => safeSend('retro:suspend'));
  sleepBlock = powerSaveBlocker.start('prevent-display-sleep');
  await win.loadURL(S.ENTRY + (firstRun ? '?setup=1' : ''));
  if (!selfTest) { win.maximize(); win.show(); }
  else {
    win.show(); win.focus();
    try { await require('./self-test.cjs').run({ app, win, ses, profile, smokeDownloads }); quitting = true; app.exit(0); }
    catch (error) { console.error('DESKTOP_SMOKE_FAILED', error.stack || error.message); quitting = true; app.exit(1); }
  }
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
  app.whenReady().then(boot).catch(error => { dialog.showErrorBox('RetroBooth could not start', error.message); app.exit(1); });
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => { if (sleepBlock !== undefined && powerSaveBlocker.isStarted(sleepBlock)) powerSaveBlocker.stop(sleepBlock); });
}
