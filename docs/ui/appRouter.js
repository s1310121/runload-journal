const DEFAULT_SCREEN = "home";

function applyAlias(rawScreen, parameters, aliases) {
  const alias = aliases?.[rawScreen];
  if (!alias) return null;
  if (typeof alias === "function") return alias(new URLSearchParams(parameters));
  const nextParameters = new URLSearchParams(parameters);
  Object.entries(alias.parameters || {}).forEach(([key, value]) => {
    if (!nextParameters.has(key) && value !== undefined && value !== null && value !== "") {
      nextParameters.set(key, String(value));
    }
  });
  return Object.freeze({ screen: alias.screen, parameters: nextParameters });
}

function parseHashLocation(validScreens, aliases) {
  const rawHash = window.location.hash.replace(/^#\/?/, "");
  const [rawScreen = "", rawQuery = ""] = rawHash.split("?");
  const requestedScreen = rawScreen.trim();
  const parameters = new URLSearchParams(rawQuery);
  if (validScreens.has(requestedScreen)) {
    return Object.freeze({ screen: requestedScreen, parameters });
  }
  const aliased = applyAlias(requestedScreen, parameters, aliases);
  if (aliased && validScreens.has(aliased.screen)) return aliased;
  return Object.freeze({ screen: DEFAULT_SCREEN, parameters: new URLSearchParams() });
}

function buildHash(screenName, parameters = {}) {
  const search = parameters instanceof URLSearchParams
    ? parameters
    : new URLSearchParams(Object.entries(parameters).filter(([, value]) => value !== undefined && value !== null && value !== ""));
  const query = search.toString();
  return `#/${screenName}${query ? `?${query}` : ""}`;
}

export function createAppRouter({ availableScreens, routeAliases = {}, onScreenChange }) {
  const validScreens = new Set(availableScreens);

  function readLocation() {
    return parseHashLocation(validScreens, routeAliases);
  }

  function canonicalizeLocation(location) {
    const canonicalHash = buildHash(location.screen, location.parameters);
    if (window.location.hash !== canonicalHash) window.history.replaceState(null, "", canonicalHash);
    return location;
  }

  function navigateToScreen(screenName, parameters = {}) {
    const target = validScreens.has(screenName) ? screenName : DEFAULT_SCREEN;
    const nextHash = buildHash(target, parameters);
    if (window.location.hash === nextHash) {
      onScreenChange(readLocation());
      return;
    }
    window.location.hash = nextHash;
  }

  function handleLocationChange() {
    onScreenChange(canonicalizeLocation(readLocation()));
  }

  function start() {
    window.addEventListener("hashchange", handleLocationChange);
    if (!window.location.hash) {
      window.location.hash = buildHash(DEFAULT_SCREEN);
      return;
    }
    handleLocationChange();
  }

  return Object.freeze({ start, navigateToScreen, readLocation });
}
