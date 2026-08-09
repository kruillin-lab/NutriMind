"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js on load so the browser offers "Install this site as an app".
 * PushNotifications.tsx also registers it, but only once the user opts into
 * notifications — too late for the install prompt.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Install prompt is a progressive enhancement; app works fine without it.
    });
  }, []);

  return null;
}
