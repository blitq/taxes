/**
 * Test brokerage CSV parsers
 * Run with: node --experimental-vm-modules test-imports.js
 */

import { parseCSV, parseSchwabCSV, parseIbkrcsv, parseXtbCsv } from './src/utils/brokerageParsers.js';

console.log('=== Testing Brokerage CSV Parsers ===\n');

// Test 1: Schwab format
console.log('1. Testing Charles Schwab format:');
const schwabCSV = `Date,Description,Symbol,Quantity,Price,Commission,Amount
01/15/2025,Bought 100 AAPL @ 150.00,AAPL,100,150.00,1.00,-15001.00
01/16/2025,Bought 50 MSFT @ 380.00,MSFT,50,380.00,0.50,-19000.50
02/15/2025,Sold 50 AAPL @ 160.00,AAPL,-50,160.00,1.00,7999.00
03/15/2025,Dividend received from AAPL,AAPL,,0.00,0.00,100.00`;

const schwabResult = parseSchwabCSV(schwabCSV);
console.log(`   Parsed ${schwabResult.transactions.length} transactions`);
console.log(`   Errors: ${schwabResult.errors.length}`);
schwabResult.transactions.forEach(tx => {
  console.log(`   - ${tx.date} ${tx.type} ${tx.ticker} ${tx.shares} @ $${tx.priceUsd} fee:$${tx.feeUsd}`);
});

// Test 2: IBKR format
console.log('\n2. Testing Interactive Brokers format:');
const ibkrCSV = `TradeDate,Symbol,Quantity,T.Price,Comm/Fee,Description,Currency
2025-01-15,AAPL,100,150.00,1.00,Bought 100 AAPL,USD
2025-01-16,MSFT,50,380.00,1.50,Bought 50 MSFT,USD
2025-02-15,AAPL,-50,160.00,1.00,Sold 50 AAPL,USD
2025-03-15,AAPL,,0.00,0.00,Dividend AAPL,USD`;

const ibkrResult = parseIbkrcsv(ibkrCSV);
console.log(`   Parsed ${ibkrResult.transactions.length} transactions`);
console.log(`   Errors: ${ibkrResult.errors.length}`);
ibkrResult.transactions.forEach(tx => {
  console.log(`   - ${tx.date} ${tx.type} ${tx.ticker} ${tx.shares} @ $${tx.priceUsd} fee:$${tx.feeUsd}`);
});

// Test 3: XTB format
console.log('\n3. Testing XTB format:');
const xtbCSV = `Date,Type,Symbol,Quantity,Price,Commission,Swap,Balance
2025-01-15,buy,AAPL,100,150.00,1.00,0.00,0.00
2025-01-16,buy,MSFT,50,380.00,1.50,0.00,0.00
2025-02-15,sell,AAPL,50,160.00,1.00,0.00,7999.00
2025-03-15,dividend,AAPL,100,1.00,0.00,0.00,100.00`;

const xtbResult = parseXtbCsv(xtbCSV);
console.log(`   Parsed ${xtbResult.transactions.length} transactions`);
console.log(`   Errors: ${xtbResult.errors.length}`);
xtbResult.transactions.forEach(tx => {
  console.log(`   - ${tx.date} ${tx.type} ${tx.ticker} ${tx.shares} @ $${tx.priceUsd} fee:$${tx.feeUsd}`);
});

// Test 4: Auto-detection
console.log('\n4. Testing auto-detection (parseCSV):');
const schwabAuto = parseCSV(schwabCSV, null);
console.log(`   Schwab auto-detected as: ${schwabAuto.transactions.length} transactions`);
const ibkrAuto = parseCSV(ibkrCSV, null);
console.log(`   IBKR auto-detected as: ${ibkrAuto.transactions.length} transactions`);
const xtbAuto = parseCSV(xtbCSV, null);
console.log(`   XTB auto-detected as: ${xtbAuto.transactions.length} transactions`);

// Test with hint
console.log('\n5. Testing with explicit brokerage hint:');
const schwabHint = parseCSV(ibkrCSV, 'schwab');
console.log(`   Forced Schwab parser on IBKR data: ${schwabHint.transactions.length} transactions, ${schwabHint.errors.length} errors`);

console.log('\n=== All parser tests completed ===');
