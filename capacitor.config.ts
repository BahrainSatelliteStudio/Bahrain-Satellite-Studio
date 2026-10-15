import type { CapacitorConfig } from '@capacitor/cli';

// تطبيق Bahrain Satellite — غلاف أندرويد يحمّل نسخة الويب المنشورة.
// غيّر server.url إلى رابط موقعك المنشور (مثل https://panel.bhsat.me أو رابط Lovable المنشور).
const config: CapacitorConfig = {
  appId: 'me.bhsat.app',
  appName: 'Bahrain Satellite',
  webDir: 'public',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://id-preview--e9e293d2-9d89-4654-9db2-f04937384f95.lovable.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
