/**
 * Business Logic Layer – Gamification
 * XP, levels, badges, and grade calculation.
 */

import {
  addXP as stateAddXP,
  unlockBadge as stateUnlockBadge,
  getXP,
  getUserLevel,
  getBadges
} from './appState.js';
import { XP_REWARDS, BADGE_IDS } from '../utils/constants.js';

/**
 * Awards XP and returns the updated totals.
 * @param {number} amount
 * @returns {{ xp: number, userLevel: number, score: number }}
 */
export function awardXP(amount) {
  return stateAddXP(amount);
}

/**
 * Unlocks a badge by id. Returns true if it was newly unlocked.
 * @param {string} badgeId
 * @returns {boolean}
 */
export function unlockBadge(badgeId) {
  return stateUnlockBadge(badgeId);
}

/**
 * Convenience wrappers for common rewards
 */
export function rewardJournalSuccess() {
  unlockBadge(BADGE_IDS.JOURNAL_MASTER);
  return awardXP(XP_REWARDS.JOURNAL_SUCCESS);
}

export function rewardLedgerPost() {
  unlockBadge(BADGE_IDS.LEDGER_EXPERT);
  return awardXP(XP_REWARDS.LEDGER_POST);
}

export function rewardAdjustmentVerify() {
  return awardXP(XP_REWARDS.ADJUSTMENT_VERIFY);
}

export function rewardWorksheetComplete() {
  unlockBadge(BADGE_IDS.WORKSHEET_KING);
}

export function rewardFinancialReport() {
  unlockBadge(BADGE_IDS.FINANCIAL_PRO);
}

/**
 * Computes a letter grade from current XP.
 * @returns {string}
 */
export function getGrade() {
  const xp = getXP();
  if (xp >= 200) return 'A (Sempurna)';
  if (xp >= 100) return 'B (Baik)';
  if (xp >= 50) return 'C (Cukup)';
  return 'D (Perlu Latihan)';
}

export function getScoreSummary() {
  return {
    xp: getXP(),
    userLevel: getUserLevel(),
    score: Math.min(100, getXP()),
    grade: getGrade(),
    badges: getBadges()
  };
}
