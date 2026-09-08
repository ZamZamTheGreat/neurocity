"use client";

import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";

const trustedHosts = new Set(["neurocity.city", "www.neurocity.city"]);

export function NativeAppBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    document.documentElement.dataset.nativeApp = Capacitor.getPlatform();
    const deepLink = App.addListener("appUrlOpen", ({ url }) => {
      try {
        const destination = new URL(url);
        if (trustedHosts.has(destination.hostname))
          window.location.assign(`${destination.pathname}${destination.search}${destination.hash}`);
      } catch {
        // Ignore malformed operating-system intents.
      }
    });
    const backButton = App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void App.minimizeApp();
    });
    const openExternalLink = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute("download")) return;
      let destination: URL;
      try { destination = new URL(anchor.href, window.location.href); } catch { return; }
      if (!destination.protocol.startsWith("http") || trustedHosts.has(destination.hostname)) return;
      event.preventDefault();
      void Browser.open({ url: destination.toString(), presentationStyle: "popover" });
    };
    document.addEventListener("click", openExternalLink);
    return () => {
      delete document.documentElement.dataset.nativeApp;
      document.removeEventListener("click", openExternalLink);
      void deepLink.then((listener) => listener.remove());
      void backButton.then((listener) => listener.remove());
    };
  }, []);
  return null;
}
