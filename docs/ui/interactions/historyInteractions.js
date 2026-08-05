function formEntries(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function bindHistory({ services, router, rerender }) {
  document.getElementById("history-record-filter-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    router.navigateToScreen("history", formEntries(event.currentTarget));
  });
  document.getElementById("regional-history-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    router.navigateToScreen("history", formEntries(event.currentTarget));
  });
  document.getElementById("subjective-history-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    router.navigateToScreen("history", formEntries(event.currentTarget));
  });
  document.querySelectorAll('[data-action="delete-history-record"]').forEach((button) => button.addEventListener("click", () => {
    const label = button.dataset.recordLabel || "この記録";
    if (!window.confirm(`${label}を削除しますか？`)) return;
    const result = services.workflows.history.deleteRecord(button.dataset.recordId || "");
    if (result.ok) rerender();
    else window.alert("記録を削除できませんでした。端末の保存状態を確認してください。");
  }));
  document.querySelector('[data-action="undo-history-delete"]')?.addEventListener("click", () => {
    const result = services.workflows.history.undoDelete();
    if (result.ok) rerender();
    else window.alert("削除した記録を元に戻せませんでした。端末の保存状態を確認してください。");
  });
}
