import type { CapacitorConfig } from '@capacitor/cli';
import { manufacturingConfig } from './src/lib/player/manufacturing';

// Build-tool entry only: never manufacture a customer app with fallback branding.
const config: CapacitorConfig = manufacturingConfig({
  appName: process.env.APP_NAME,
  packageId: process.env.PKG,
  appUrl: process.env.APP_URL,
  logoUrl: process.env.LOGO_URL,
  version: process.env.VER,
});

export default config;
