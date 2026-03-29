import { parseIbkrcsv } from './src/utils/brokerageParsers.js';

const ibkrCSV = `TradeDate,Symbol,Quantity,T.Price,Comm/Fee,Description,Currency
2025-01-15,AAPL,100,150.00,1.00,Bought 100 AAPL,USD
2025-02-15,AAPL,-50,160.00,1.00,Sold 50 AAPL,USD`;

console.log('Parsing IBKR CSV:');
const lines = ibkrCSV.split('\n');
console.log('Headers:', lines[0].split(','));

const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
console.log('Lowercase headers:', headers);

const colMap = {
  date: headers.findIndex(h => h.includes('trade date') || h === 'date'),
  symbol: headers.findIndex(h => h.includes('symbol')),
  quantity: headers.findIndex(h => h.includes('quantity') || h.includes('shares')),
  price: headers.findIndex(h => h.includes('t.price') || h.includes('price')),
  commission: headers.findIndex(h => h.includes('comm') || h.includes('commission')),
  fee: headers.findIndex(h => h.includes('fee')),
  description: headers.findIndex(h => h.includes('description') || h.includes('notes')),
  amount: headers.findIndex(h => h.includes('cash effect') || h.includes('amount')),
};

console.log('Column map:', colMap);

const result = parseIbkrcsv(ibkrCSV);
console.log('Result:', result);
