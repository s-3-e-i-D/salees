import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.salees.keyboard",
  appName: "Salees",
  webDir: "dist-ios",
  ios: {
    contentInset: "never",
    backgroundColor: "#121214",
  },
};

export default config;
