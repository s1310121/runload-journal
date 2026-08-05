const NOTICE_ID = "pwa-update-notice";
const LOCAL_DEVELOPMENT_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

function ensureUpdateNotice() {
  let notice = document.getElementById(NOTICE_ID);
  if (notice) return notice;
  notice = document.createElement("div");
  notice.id = NOTICE_ID;
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  notice.hidden = true;
  notice.className = "pwa-update-notice";
  document.body.appendChild(notice);
  return notice;
}

function showUpdateNotice(registration) {
  const notice = ensureUpdateNotice();
  notice.hidden = false;
  notice.innerHTML = `
    <div class="pwa-update-notice__inner">
      <span>アプリの更新があります。保存中の記録はそのままです。</span>
      <button type="button" class="pwa-update-notice__button" data-pwa-update-button>更新</button>
    </div>
  `;
  notice.querySelector("[data-pwa-update-button]")?.addEventListener("click", () => {
    registration.waiting?.postMessage({ type: "SKIP_WAITING" });
  });
}

function isLocalLiveServerDevelopment() {
  return window.location.protocol === "http:"
    && LOCAL_DEVELOPMENT_HOSTS.has(window.location.hostname);
}

async function clearLocalPwaDeliveryState() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations
      .filter((registration) => {
        const scriptUrl = registration.active?.scriptURL
          || registration.waiting?.scriptURL
          || registration.installing?.scriptURL
          || "";
        return scriptUrl.endsWith("/service-worker.js");
      })
      .map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    const runLoadKeys = keys.filter((key) => (
      key.startsWith("runload-journal-") || key.startsWith("running-journal-")
    ));
    await Promise.all(runLoadKeys.map((key) => caches.delete(key)));
  }
}

export function registerPwaServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

  if (isLocalLiveServerDevelopment()) {
    window.addEventListener("load", () => {
      clearLocalPwaDeliveryState().catch((error) => {
        console.info("Local PWA cache cleanup skipped", error);
      });
    }, { once: true });
    return;
  }

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js");
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateNotice(registration);
      }
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateNotice(registration);
          }
        });
      });
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (error) {
      console.info("PWA registration skipped", error);
    }
  });
}
