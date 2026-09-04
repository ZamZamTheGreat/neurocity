"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstaller() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [iosInstallAvailable, setIosInstallAvailable] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const alreadyInstalled = window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
    setIosInstallAvailable(iosDevice && !alreadyInstalled);
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((error) => {
          console.warn("NeuroCity service worker registration failed", error);
        });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installed = () => { setInstallPrompt(null); setIosInstallAvailable(false); setShowIosGuide(false); };

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("load", register);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  useEffect(() => {
    if (!showIosGuide) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setShowIosGuide(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showIosGuide]);

  if (!installPrompt && !iosInstallAvailable) return null;

  async function install() {
    if (!installPrompt) {
      setShowIosGuide(true);
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return <>
    <button className="pwa-install" type="button" onClick={install} aria-label="Install NeuroCity on this device">
      <span aria-hidden="true">↓</span>
      Install NeuroCity
    </button>
    {showIosGuide && (
      <div className="ios-install-backdrop" onClick={() => setShowIosGuide(false)}>
        <section className="ios-install-guide" role="dialog" aria-modal="true" aria-labelledby="ios-install-title" onClick={(event) => event.stopPropagation()}>
          <button className="ios-install-close" type="button" onClick={() => setShowIosGuide(false)} aria-label="Close installation instructions">×</button>
          <img src="/icons/neurocity-malls-180.png?v=20260902" alt="" />
          <p className="eyebrow">Install on iPhone or iPad</p>
          <h2 id="ios-install-title">Add NeuroCity to your Home Screen</h2>
          <ol>
            <li><b>1</b><span>Tap Safari&apos;s <strong>Share</strong> button <i aria-hidden="true">□↑</i>.</span></li>
            <li><b>2</b><span>Scroll through the menu and choose <strong>Add to Home Screen</strong>.</span></li>
            <li><b>3</b><span>Tap <strong>Add</strong>. NeuroCity will open like an app from your Home Screen.</span></li>
          </ol>
          <small>Your current NeuroCity sign-in is preserved when iOS creates the Home Screen app.</small>
          <button className="ios-install-done" type="button" onClick={() => setShowIosGuide(false)}>Got it</button>
        </section>
      </div>
    )}
  </>;
}
