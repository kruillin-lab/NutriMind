const CACHE_NAME = "nutrimind-v1";

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        "/",
        "/dashboard",
        // Add other critical assets here
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "NutriMind";
    const options = {
      body: data.body || "You have a new notification",
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: data.tag || "default",
      requireInteraction: data.requireInteraction || false,
      data: data.data || {},
      actions: data.actions || [],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error("Error showing push notification:", error);
    // Fallback for simple text payload
    event.waitUntil(
      self.registration.showNotification("NutriMind", {
        body: event.data.text(),
        icon: "/icon-192x192.png",
      })
    );
  }
});

// Notification click event - handle user clicking notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData = event.notification.data;
  let url = "/dashboard";

  // Navigate based on notification type
  if (notificationData?.type === "meal-reminder") {
    url = "/dashboard";
  } else if (notificationData?.type === "goal-progress") {
    url = "/dashboard";
  } else if (notificationData?.url) {
    url = notificationData.url;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window client is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip API requests
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
