/**
 * Storage Layer – LocalStorage persistence
 * Isolates all browser storage access so the rest of the app
 * never talks to localStorage directly.
 */

import { STORAGE_KEYS } from '../utils/constants.js';

/**
 * Saves a partial app state snapshot (XP, level, badges).
 * @param {{ xp: number, userLevel: number, badges: Array }} data
 */
export function saveAppState(data) {
  try {
    localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify({
      xp: data.xp,
      userLevel: data.userLevel,
      badges: data.badges
    }));
  } catch (e) {
    console.warn('Failed to save app state:', e);
  }
}

/**
 * Loads previously saved app state, or null if none exists.
 * @returns {{ xp: number, userLevel: number, badges: Array } | null}
 */
export function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load app state:', e);
    return null;
  }
}

/**
 * Theme preference helpers
 */
export function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

export function loadTheme() {
  return localStorage.getItem(STORAGE_KEYS.THEME);
}

/**
 * Onboarding flag helpers
 */
export function hasCompletedOnboarding() {
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING) === 'true';
}

export function markOnboardingComplete() {
  localStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
}

export function saveSidebarCollapsed(collapsed) {
  try {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed ? 'true' : 'false');
  } catch (_) { /* ignore */ }
}

export function loadSidebarCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';
  } catch (_) {
    return false;
  }
}

/**
 * Session persistence: the current case (level/company/period/accounts/
 * transactions/adjustments), the student's own submitted journal &
 * adjustment work, and any un-submitted draft rows still being typed —
 * so a page reload or accidental tab close doesn't lose progress.
 */
export function saveSession(data) {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ ...data, savedAt: Date.now() }));
    return true;
  } catch (_) {
    return false;
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch (_) { /* ignore */ }
}

/**
 * Tax / Invoicing module persistence (Simulator Accounting & Perpajakan
 * Interaktif). Isolated under its own storage key so it never collides
 * with the existing case-exercise state.
 */
export function saveTaxState(data) {
  try {
    localStorage.setItem(STORAGE_KEYS.TAX_STATE, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('Failed to save tax state:', e);
    return false;
  }
}

export function loadTaxState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TAX_STATE);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed to load tax state:', e);
    return null;
  }
}

/**
 * Whole-application backup: bundles every known localStorage key used by
 * the app (gamification state, session, theme, tax/invoicing module) into
 * one portable JSON object the user can download and restore later.
 */
export function exportAllData() {
  const bundle = { __app: 'ActMaster Pro', __version: 1, exportedAt: new Date().toISOString(), data: {} };
  Object.values(STORAGE_KEYS).forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) bundle.data[key] = raw;
    } catch (_) { /* ignore */ }
  });
  return bundle;
}

/**
 * Restores a bundle produced by exportAllData(). Returns true on success.
 * Unknown/legacy keys are ignored; malformed input throws so the caller
 * can show a friendly error instead of silently corrupting storage.
 */
export function importAllData(bundle) {
  if (!bundle || typeof bundle !== 'object' || !bundle.data) {
    throw new Error('Berkas backup tidak valid.');
  }
  const knownKeys = new Set(Object.values(STORAGE_KEYS));
  Object.entries(bundle.data).forEach(([key, value]) => {
    if (!knownKeys.has(key)) return;
    try {
      localStorage.setItem(key, value);
    } catch (_) { /* ignore individual key failures */ }
  });
  return true;
}

/**
 * Wipes every piece of data the app owns in localStorage (gamification
 * progress, session, theme, and the tax/invoicing module). Used by the
 * "Reset Data" action after explicit user confirmation.
 */
export function resetAllData() {
  Object.values(STORAGE_KEYS).forEach(key => {
    try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
  });
}
