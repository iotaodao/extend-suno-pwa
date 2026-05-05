/// <reference types="@capacitor/cli" />

const config = {
  appId: 'com.extend.suno',
  appName: 'Extend Suno',
  webDir: 'dist',
  bundledWebRuntime: false,

  // Use the bundled Vite build, no remote URL.
  // For dev with hot-reload, uncomment server.url and point to your dev server:
  // server: { url: 'http://192.168.1.100:5173', cleartext: true },

  android: {
    backgroundColor: '#070F1F',
    allowMixedContent: false,
    captureInput: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: false,            // we hide it manually after React mount
      backgroundColor: '#070F1F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      spinnerColor: '#A5C8F0',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      backgroundColor: '#070F1F',
      style: 'DARK',
      overlaysWebView: false,
    },
    App: {
      // navigation handled by App.addListener('backButton') in src/lib/native.js
    },
    Filesystem: {
      // Used for saving generated tracks to Documents/Extend-Suno/
    },
    Share: {
      // Used for sharing extended tracks
    },
  },
};

export default config;
