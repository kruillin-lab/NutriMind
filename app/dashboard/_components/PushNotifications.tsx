"use client";

import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Loader2, CheckCircle, XCircle } from "lucide-react";

interface SubscriptionInfo {
  id: string;
  endpoint: string;
  userAgent: string | null;
  createdAt: string;
}

export function PushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setIsSupported(supported);
  }, []);

  // Fetch subscription status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/push-subscriptions");
      if (response.ok) {
        const data = await response.json();
        setIsEnabled(data.enabled);
        setSubscriptionInfo(data.subscriptions || []);
      }
    } catch (err) {
      console.error("Error fetching push status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSupported) {
      fetchStatus();
    } else {
      setLoading(false);
    }
  }, [isSupported, fetchStatus]);

  // Register service worker and subscribe
  const subscribe = async () => {
    setSubscribing(true);
    setError(null);

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Get push subscription
      let subscription = await registration.pushManager.getSubscription();

      // If no subscription exists, create one
      if (!subscription) {
        // Generate VAPID keys (these should come from server in production)
        // For demo purposes, we'll use a client-side key pair
        const vapidPublicKey = "BEl62iSMf-VZBdgwe8DrhN9CJtZ_2kp6vB7aE8x0X8P0R9v7d8Z0Qx9r8T7z6Y5x4W3v2U1t0S9r8Q7p6O5n4M";

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // Send subscription to server
      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh,
            auth: subscription.toJSON().keys?.auth,
          },
        }),
      });

      if (response.ok) {
        setIsEnabled(true);
        await fetchStatus();
      } else {
        throw new Error("Failed to save subscription");
      }
    } catch (err) {
      console.error("Error subscribing:", err);
      setError("Failed to enable push notifications. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    setSubscribing(true);
    setError(null);

    try {
      // Unsubscribe from server
      const response = await fetch("/api/push-subscriptions", {
        method: "DELETE",
      });

      if (response.ok) {
        // Unsubscribe from push manager
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }

        setIsEnabled(false);
        setSubscriptionInfo([]);
      } else {
        throw new Error("Failed to unsubscribe");
      }
    } catch (err) {
      console.error("Error unsubscribing:", err);
      setError("Failed to disable push notifications. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  // Toggle handler
  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  // Helper to convert VAPID key
  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  if (!isSupported) {
    return (
      <section className="surface overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="smallcaps">Push Notifications</h3>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <XCircle className="h-5 w-5" />
            <p className="text-sm">
              Push notifications are not supported in your browser
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="surface p-6">
        <div className="flex items-center justify-center h-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <section className="surface overflow-hidden">
      <div className="foil" />
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" style={{ color: "var(--brass)" }} />
          <h3 className="smallcaps">Push Notifications</h3>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={subscribing}
          />
          <Label className="sr-only">Enable push notifications</Label>
        </div>
      </div>
      <div className="px-5 py-4">
        {error && (
          <div className="mb-4 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            {isEnabled ? (
              <CheckCircle className="h-5 w-5 mt-0.5" style={{ color: "var(--ledger-green)" }} />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {isEnabled ? "Notifications enabled" : "Notifications disabled"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isEnabled
                  ? "You'll receive notifications for meal reminders and daily goals"
                  : "Enable to get notified about meal times and daily progress"}
              </p>
            </div>
          </div>

          {isEnabled && subscriptionInfo.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="smallcaps mb-2">
                Active devices ({subscriptionInfo.length})
              </p>
              <div>
                {subscriptionInfo.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between border-t border-border py-2 first:border-t-0 text-xs"
                  >
                    <span className="truncate max-w-[200px] text-foreground">
                      {sub.userAgent || "Unknown device"}
                    </span>
                    <span className="num text-muted-foreground">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subscribing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEnabled ? "Disabling..." : "Enabling..."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
