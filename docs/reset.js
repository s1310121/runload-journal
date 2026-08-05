const status = document.getElementById("reset-status");

async function resetRunLoadDeliveryState() {
  const registrations = "serviceWorker" in navigator
    ? await navigator.serviceWorker.getRegistrations()
    : [];
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const keys = await caches.keys();
    const runLoadKeys = keys.filter((key) => key.startsWith("runload-journal-") || key.startsWith("running-journal-"));
    await Promise.all(runLoadKeys.map((key) => caches.delete(key)));
  }

  status.textContent = "画面キャッシュを更新しました。RunLoadを開きます。";
  window.setTimeout(() => window.location.replace("./#/home"), 250);
}

resetRunLoadDeliveryState().catch((error) => {
  console.error("RunLoad delivery reset failed", error);
  status.textContent = "画面キャッシュを更新できませんでした。VS CodeのLive Serverが起動しているか確認してください。";
});
