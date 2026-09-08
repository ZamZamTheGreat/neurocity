import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.neuroedge.neurocity",
  appName: "NeuroCity",
  webDir: "native-shell",
  server: {
    url: "https://neurocity.city",
    cleartext: false,
    allowNavigation: ["neurocity.city", "www.neurocity.city"],
    errorPath: "index.html",
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
