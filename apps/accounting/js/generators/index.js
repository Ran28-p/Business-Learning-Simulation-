/**
 * Generator Facade
 * Single entry-point that orchestrates:
 *   Company → Scenario → Transactions → Adjustments
 * and returns a complete simulation package with answer keys.
 */

import { generateCompany } from './companyGenerator.js';
import { generateScenario } from './scenarioGenerator.js';
import { generateTransactions } from './transactionGenerator.js';
import { generateAdjustments } from './adjustmentGenerator.js';
import { periodEndDate } from './randomUtils.js';

/**
 * Generate a complete simulation package.
 * @param {number} [level=1]
 * @param {number} [transactionCount=6]
 * @returns {{
 *   company: object,
 *   scenario: object,
 *   transactions: Array,   // each with answer-key entries
 *   adjustments: Array,    // each with answer-key entries
 *   periodLabel: string
 * }}
 */
export function generateSimulation(level = 1, transactionCount = 6) {
  const company = generateCompany(level);
  const scenario = generateScenario(company, transactionCount);
  const transactions = generateTransactions(scenario);
  const adjustments = generateAdjustments(company, transactions);

  const end = periodEndDate(company.month, company.year);
  const monthNames = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return {
    company,
    scenario,
    transactions,
    adjustments,
    periodLabel: `${end.day} ${monthNames[company.month]} ${company.year}`
  };
}

export {
  generateCompany,
  generateScenario,
  generateTransactions,
  generateAdjustments
};
