/**
 * Scenario Generator
 * Builds a high-level scenario blueprint from a company profile.
 * The blueprint tells the Transaction Generator which event types to fire.
 */

import { randInt, randChoice } from './randomUtils.js';

/**
 * Event-type catalogue per company level.
 * weight = relative probability of inclusion.
 */
const EVENT_CATALOGUE = {
  1: [ // Jasa
    { type: 'OPENING_CAPITAL', required: true, weight: 1 },
    { type: 'BUY_SUPPLIES_CASH', required: false, weight: 0.85 },
    { type: 'PREPAID_RENT', required: false, weight: 0.8 },
    { type: 'REVENUE_CASH', required: false, weight: 0.95 },
    { type: 'BUY_EQUIPMENT_MIXED', required: false, weight: 0.7 },
    { type: 'REVENUE_CREDIT', required: false, weight: 0.85 },
    { type: 'EXPENSE_UTILITIES', required: false, weight: 0.75 },
    { type: 'UNEARNED_REVENUE', required: false, weight: 0.6 },
    { type: 'COLLECT_RECEIVABLE', required: false, weight: 0.7, dependsOn: 'REVENUE_CREDIT' },
    { type: 'OWNER_WITHDRAWAL', required: false, weight: 0.65 },
    { type: 'PAY_PAYABLE', required: false, weight: 0.6, dependsOn: 'BUY_EQUIPMENT_MIXED' },
    { type: 'PAY_SALARY', required: false, weight: 0.9 }
  ],
  2: [ // Dagang
    { type: 'OPENING_CAPITAL', required: true, weight: 1 },
    { type: 'PURCHASE_CREDIT', required: false, weight: 0.9 },
    { type: 'SALE_CASH', required: false, weight: 0.85 },
    { type: 'PURCHASE_RETURN', required: false, weight: 0.5, dependsOn: 'PURCHASE_CREDIT' },
    { type: 'PAY_PURCHASE_DISCOUNT', required: false, weight: 0.55, dependsOn: 'PURCHASE_CREDIT' },
    { type: 'SALE_CREDIT', required: false, weight: 0.8 },
    { type: 'SALES_RETURN', required: false, weight: 0.45, dependsOn: 'SALE_CREDIT' },
    { type: 'FREIGHT_IN', required: false, weight: 0.5 },
    { type: 'COLLECT_SALE_DISCOUNT', required: false, weight: 0.5, dependsOn: 'SALE_CREDIT' },
    { type: 'PREPAID_INSURANCE', required: false, weight: 0.6 },
    { type: 'BUY_SUPPLIES_CASH', required: false, weight: 0.7 }
  ],
  3: [ // Manufaktur
    { type: 'OPENING_CAPITAL', required: true, weight: 1 },
    { type: 'BUY_RAW_MATERIAL', required: false, weight: 0.9 },
    { type: 'ISSUE_RAW_TO_WIP', required: false, weight: 0.85, dependsOn: 'BUY_RAW_MATERIAL' },
    { type: 'DIRECT_LABOR', required: false, weight: 0.85 },
    { type: 'FACTORY_OVERHEAD', required: false, weight: 0.8 },
    { type: 'TRANSFER_TO_FG', required: false, weight: 0.75, dependsOn: 'ISSUE_RAW_TO_WIP' },
    { type: 'SALE_FG_CREDIT', required: false, weight: 0.8, dependsOn: 'TRANSFER_TO_FG' },
    { type: 'SELLING_EXPENSE', required: false, weight: 0.7 }
  ]
};

/**
 * Generate a scenario blueprint.
 * @param {object} company  – from companyGenerator
 * @param {number} [targetCount=6]  – desired number of transactions
 * @returns {{ company, events: string[], targetCount, seed: number }}
 */
export function generateScenario(company, targetCount = 6) {
  const catalogue = EVENT_CATALOGUE[company.level] || EVENT_CATALOGUE[1];
  const selected = [];

  // Always include required events
  catalogue.filter(e => e.required).forEach(e => selected.push(e.type));

  // Weighted random selection for optional events
  const optional = catalogue.filter(e => !e.required);
  const shuffled = [...optional].sort(() => Math.random() - 0.5);

  for (const ev of shuffled) {
    if (selected.length >= targetCount) break;
    if (Math.random() > ev.weight) continue;
    // Honour dependencies
    if (ev.dependsOn && !selected.includes(ev.dependsOn)) continue;
    selected.push(ev.type);
  }

  // If still short, force-add high-weight optionals
  if (selected.length < targetCount) {
    for (const ev of optional) {
      if (selected.length >= targetCount) break;
      if (!selected.includes(ev.type)) {
        if (ev.dependsOn && !selected.includes(ev.dependsOn)) continue;
        selected.push(ev.type);
      }
    }
  }

  return {
    company,
    events: selected,
    targetCount,
    seed: Date.now() ^ randInt(0, 1e9)
  };
}
