/**
 * Business Logic Layer – Central Application State
 * Single source of truth for runtime state.
 * Other modules read/write through exported getters and mutators.
 */

import { DEFAULT_BADGES, MODES } from '../utils/constants.js';
import { getAccountsByLevel } from '../../data/accounts.js';
import { saveAppState, loadAppState } from '../storage/localStorage.js';

const state = {
  level: 1,
  mode: MODES.BELAJAR,
  xp: 0,
  userLevel: 1,
  score: 0,
  badges: DEFAULT_BADGES.map(b => ({ ...b })),
  accounts: getAccountsByLevel(1),
  transactions: [],
  adjustments: [],
  journalData: [],
  adjustmentData: [],
  closingData: []
};

/* ─── Getters ─── */

export function getState() {
  return state;
}

export function getAccounts() {
  return state.accounts;
}

export function getJournalData() {
  return state.journalData;
}

export function getLevel() {
  return state.level;
}

export function getMode() {
  return state.mode;
}

export function getXP() {
  return state.xp;
}

export function getUserLevel() {
  return state.userLevel;
}

export function getBadges() {
  return state.badges;
}

/* ─── Mutators ─── */

export function setLevel(level) {
  state.level = Number(level);
  state.accounts = getAccountsByLevel(state.level);
}

export function setMode(mode) {
  state.mode = mode;
}

export function setJournalData(entries) {
  state.journalData = entries;
}

export function setAdjustmentData(entries) {
  state.adjustmentData = entries;
}

export function setClosingData(entries) {
  state.closingData = entries;
}

export function addXP(value) {
  state.xp += value;
  state.userLevel = Math.floor(state.xp / 100) + 1;
  state.score = Math.min(100, state.xp);
  persist();
  return { xp: state.xp, userLevel: state.userLevel, score: state.score };
}

export function unlockBadge(id) {
  const badge = state.badges.find(b => b.id === id);
  if (badge && !badge.unlocked) {
    badge.unlocked = true;
    persist();
    return true;
  }
  return false;
}

/**
 * Resets XP, level, badges, and any captured journal/adjustment/closing
 * data back to defaults, and persists the reset. Used by the
 * "Reset / Hapus Riwayat" action.
 */
export function resetAppState() {
  state.xp = 0;
  state.userLevel = 1;
  state.score = 0;
  state.badges = DEFAULT_BADGES.map(b => ({ ...b }));
  state.journalData = [];
  state.adjustmentData = [];
  state.closingData = [];
  persist();
}

/* ─── Persistence bridge ─── */

function persist() {
  saveAppState({
    xp: state.xp,
    userLevel: state.userLevel,
    badges: state.badges
  });
}

/**
 * Restores XP / level / badges from localStorage on startup.
 */
export function hydrateFromStorage() {
  const saved = loadAppState();
  if (!saved) return;
  state.xp = saved.xp || 0;
  state.userLevel = saved.userLevel || 1;
  if (Array.isArray(saved.badges)) {
    state.badges = saved.badges;
  }
}
