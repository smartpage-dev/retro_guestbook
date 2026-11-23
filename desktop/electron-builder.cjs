'use strict';
module.exports = {
  appId: 'studio.luce.retrobooth.desktop',
  productName: 'RetroBooth',
  directories: { output: 'release', buildResources: 'resources' },
  files: ['main.cjs', 'preload.cjs', 'security.cjs', 'assets.cjs', 'self-test.cjs', 'web/**/*', 'resources/icon.ico', 'package.json'],
  asar: true,
  npmRebuild: false,
  forceCodeSigning: false,
  compression: 'normal',
  publish: null,
  win: { icon: 'resources/icon.ico', executableName: 'RetroBooth', requestedExecutionLevel: 'asInvoker' },
  nsis: {
    oneClick: false, perMachine: false, allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false, createDesktopShortcut: 'always', runAfterFinish: true,
    artifactName: 'RetroBooth-${version}-Windows-${arch}-Setup.${ext}'
  },
  portable: { artifactName: 'RetroBooth-${version}-Windows-${arch}-Portable.${ext}' }
};
