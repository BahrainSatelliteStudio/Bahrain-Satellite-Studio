import { manufacturingConfig } from "../src/lib/player/manufacturing";

// Runs only in the APK build environment, never imported by app routes.
const config = manufacturingConfig({
  appName: process.env.APP_NAME,
  packageId: process.env.PKG,
  appUrl: process.env.APP_URL,
  logoUrl: process.env.LOGO_URL,
  version: process.env.VER,
});
await Bun.write("capacitor.config.json", JSON.stringify(config, null, 2));