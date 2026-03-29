/**
 * Quick test for tax calculator
 * Run with: node --experimental-vm-modules test-tax-calculator.js
 */

import { calculateTaxes } from './src/utils/taxCalculator.js';

// Mock exchange rates
const rates = {
  '2025-01-15': 4.0, // USD/PLN
  '2025-02-15': 4.1,
  '2025-03-15': 4.05,
};

// Sample transactions
const transactions = [
  {
    id: 'buy1',
    type: 'buy',
    date: '2025-01-15',
    ticker: 'AAPL',
    shares: 100,
    priceUsd: 150,
    feeUsd: 1,
  },
  {
    id: 'sell1',
    type: 'sell',
    date: '2025-02-15',
    ticker: 'AAPL',
    shares: 50,
    priceUsd: 160,
    feeUsd: 1,
  },
  {
    id: 'dividend1',
    type: 'dividend',
    date: '2025-03-15',
    ticker: 'AAPL',
    dividendGrossUsd: 100,
    foreignTaxUsd: 15, // 15% US withholding
  },
];

const summary = calculateTaxes(transactions, rates);

console.log('Tax Calculation Results:');
console.log('-'.repeat(50));
console.log(`Capital Gain (PLN): ${summary.totalCapitalGainPlN.toFixed(2)}`);
console.log(`Dividends Gross (PLN): ${summary.totalDividendGrossPlN.toFixed(2)}`);
console.log(`Foreign Tax Credit (PLN): ${summary.totalForeignTaxCreditPlN.toFixed(2)}`);
console.log(`Capital Gains Tax: ${summary.capitalGainsTaxPlN.toFixed(2)}`);
console.log(`Dividend Tax: ${summary.dividendTaxPlN.toFixed(2)}`);
console.log(`Total Tax: ${summary.totalTaxPlN.toFixed(2)}`);
console.log('\nRealized Gains:', summary.realizedGains);
