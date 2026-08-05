function getFocusableElements(container) {
  if (!container) return [];
  return [...container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
}

function bindGuideKeyboard(dialog, onCloseGuide) {
  if (!dialog) return;
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCloseGuide();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = getFocusableElements(dialog);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}


function bindGuideTabKeyboard(dialog, onSelectGuideSection) {
  if (!dialog) return;
  const tabs = [...dialog.querySelectorAll('[role="tab"][data-guide-section]')];
  tabs.forEach((tab, index) => {
    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      onSelectGuideSection(tabs[nextIndex].dataset.guideSection || "steps");
    });
  });
}

function bindFeatureMenu(root) {
  const menu = root.querySelector("[data-feature-menu]");
  const button = menu?.querySelector("#feature-menu-button");
  const panel = menu?.querySelector("#feature-menu-panel");
  if (!menu || !button || !panel) return;

  const setOpen = (open, { restoreFocus = false } = {}) => {
    menu.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
    panel.hidden = !open;
    if (restoreFocus) button.focus();
  };

  button.addEventListener("click", (event) => {
    event.preventDefault();
    setOpen(panel.hidden);
  });

  menu.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || panel.hidden) return;
    event.preventDefault();
    setOpen(false, { restoreFocus: true });
  });

  root.addEventListener("click", (event) => {
    if (panel.hidden) return;
    if (menu.contains(event.target)) return;
    setOpen(false);
  });

  panel.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
}

export function bindAppShellInteractions({ root, onOpenGuide, onCloseGuide, onSelectGuideSection }) {
  root.querySelectorAll("[data-open-guide]").forEach((button) => {
    button.addEventListener("click", () => {
      const featureMenu = button.closest(".feature-menu");
      const menuButton = featureMenu?.querySelector("#feature-menu-button");
      const menuPanel = featureMenu?.querySelector("#feature-menu-panel");
      if (featureMenu && menuButton && menuPanel) {
        featureMenu.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuPanel.hidden = true;
      }
      onOpenGuide(button.dataset.openGuide || "steps");
    });
  });
  root.querySelectorAll("[data-guide-close], [data-guide-complete]").forEach((button) => {
    button.addEventListener("click", onCloseGuide);
  });
  root.querySelectorAll("[data-guide-section]").forEach((button) => {
    button.addEventListener("click", () => onSelectGuideSection(button.dataset.guideSection || "steps"));
  });
  const guidePanel = root.querySelector("[data-guide-panel]");
  bindGuideKeyboard(guidePanel, onCloseGuide);
  bindGuideTabKeyboard(guidePanel, onSelectGuideSection);
  bindFeatureMenu(root);
}
