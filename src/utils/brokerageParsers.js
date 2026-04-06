/**
 * Brokerage CSV Import Parsers
 * Supports: Charles Schwab, Interactive Brokers (IBKR), XTB
 */

/**
 * Parse date formats commonly used by brokerages
 */
function parseDate(dateStr) {
  const trimmed = dateStr.trim();

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try US format MM/DD/YYYY or MM/DD/YY
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    let month = usMatch[1].padStart(2, '0');
    let day = usMatch[2].padStart(2, '0');
    let year = usMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Try European format DD.MM.YYYY
  const euMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (euMatch) {
    const day = euMatch[1].padStart(2, '0');
    const month = euMatch[2].padStart(2, '0');
    const year = euMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try YYYYMMDD
  const compactMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
  }

  console.warn(`Could not parse date: "${dateStr}"`);
  return null;
}

/**
 * Parse number with potential currency symbols and commas/periods
 * Handles both US (1,234.56) and European (1.234,56) number formats
 */
function parseNumber(value) {
  if (!value || typeof value !== 'string') return 0;
  // Remove currency symbols and spaces
  let cleaned = value.replace(/[$€£\s]/g, '').trim();
  // Detect European format: period as thousands sep, comma as decimal (e.g. 1.234,56)
  if (/^\-?\d{1,3}(\.\d{3})+(,\d+)$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // US format or plain number: remove thousands commas
    cleaned = cleaned.replace(/,/g, '');
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normalize ticker symbol (remove .X suffixes, convert to uppercase)
 */
function normalizeTicker(symbol) {
  if (!symbol) return '';
  // Remove exchange suffixes like .X, .PA, .L, etc.
  symbol = symbol.toUpperCase().replace(/\.[A-Z]+$/, '');
  // Remove leading $
  symbol = symbol.replace(/^\$/, '');
  return symbol.trim();
}

/**
 * Charles Schwab CSV Parser
 * Expected columns: Date, Description, Symbol, Quantity, Price, Commission, Amount
 */
export function parseSchwabCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  // Map Schwab column names
  const colMap = {
    date: headers.findIndex(h => h.includes('date')),
    description: headers.findIndex(h => h.includes('description') || h.includes('type')),
    symbol: headers.findIndex(h => h.includes('symbol') || h.includes('ticker')),
    quantity: headers.findIndex(h => h.includes('quantity') || h.includes('shares')),
    price: headers.findIndex(h => h.includes('price')),
    commission: headers.findIndex(h => h.includes('commission') || h.includes('fee')),
    amount: headers.findIndex(h => h.includes('amount')),
  };

  const transactions = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 3) continue;

    try {
      const date = parseDate(cols[colMap.date]);
      const symbol = normalizeTicker(cols[colMap.symbol]);
      const quantity = Math.abs(parseNumber(cols[colMap.quantity]));
      const price = parseNumber(cols[colMap.price]);
      const commission = parseNumber(cols[colMap.commission]);
      const amount = cols[colMap.amount] ? parseNumber(cols[colMap.amount]) : null;

      // Determine transaction type from description or amount sign
      let type = 'buy';
      const description = cols[colMap.description].toLowerCase();

      if (description.includes('sell') || description.includes('sold') || description.includes('redemption')) {
        type = 'sell';
      } else if (description.includes('dividend')) {
        type = 'dividend';
      }

      // If ambiguous, check amount sign if available
      if (type === 'buy' && amount !== null) {
        type = amount < 0 ? 'buy' : 'sell';
      }

      const tx = {
        type,
        date,
        ticker: symbol,
        shares: quantity,
        priceUsd: price,
        feeUsd: commission,
        notes: cols[colMap.description],
      };

      if (tx.type === 'dividend') {
        tx.dividendGrossUsd = amount ? Math.abs(amount) : quantity * price;
        // Schwab doesn't always report foreign tax separately
        tx.foreignTaxUsd = null;
      }

      const isValid = date && symbol && (
        (type === 'dividend' && tx.dividendGrossUsd > 0) ||
        (type !== 'dividend' && quantity > 0 && price > 0)
      );

      if (isValid) {
        transactions.push(tx);
      } else {
        errors.push(`Row ${i + 1}: Missing required data`);
      }
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  return { transactions, errors, warnings: [] };
}

/**
 * Interactive Brokers (IBKR) CSV Parser
 * Common format: TradeDate, Symbol, Quantity, T.Price, Comm/Fee, Cusip, Description, Amount
 */
export function parseIbkrCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  const colMap = {
    date: headers.findIndex(h => h.includes('date') && !h.includes('expiration')), // exclude expiration date
    symbol: headers.findIndex(h => h.includes('symbol')),
    quantity: headers.findIndex(h => h.includes('quantity') || h.includes('shares')),
    price: headers.findIndex(h => h.includes('price') || h.includes('t.price')),
    commission: headers.findIndex(h => h.includes('comm') || h.includes('fee')), // IBKR uses "Comm/Fee" column
    description: headers.findIndex(h => h.includes('description') || h.includes('notes')),
    amount: headers.findIndex(h => h.includes('cash effect') || h.includes('amount')),
  };

  const transactions = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 4) continue;

    try {
      const date = parseDate(cols[colMap.date]);
      const symbol = normalizeTicker(cols[colMap.symbol]);
      const quantity = Math.abs(parseNumber(cols[colMap.quantity]));
      const price = parseNumber(cols[colMap.price]);
      const commission = parseNumber(cols[colMap.commission]);
      const amount = cols[colMap.amount] ? parseNumber(cols[colMap.amount]) : null;

      // Determine type from description or quantity sign
      let type = 'buy';
      const description = cols[colMap.description]?.toLowerCase() || '';

      if (description.includes('sell') || description.includes('sold') || description.includes('closing')) {
        type = 'sell';
      } else if (description.includes('dividend')) {
        type = 'dividend';
      }

      // IBKR often uses negative for buys, positive for sells in amount
      // Only override trade direction if not a dividend
      if (type !== 'dividend' && colMap.amount >= 0 && amount !== null) {
        type = amount < 0 ? 'buy' : 'sell';
      }

      const tx = {
        type,
        date,
        ticker: symbol,
        shares: quantity,
        priceUsd: price,
        feeUsd: commission,
        notes: cols[colMap.description],
      };

      if (tx.type === 'dividend') {
        tx.dividendGrossUsd = amount ? Math.abs(amount) : quantity * price;
      }

      const isValid = date && symbol && (
        (type === 'dividend' && tx.dividendGrossUsd > 0) ||
        (type !== 'dividend' && quantity > 0 && price > 0)
      );

      if (isValid) {
        transactions.push(tx);
      } else {
        errors.push(`Row ${i + 1}: Missing required data (date=${date}, symbol=${symbol}, qty=${quantity}, price=${price})`);
      }
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  return { transactions, errors, warnings: [] };
}

/**
 * XTB CSV Parser
 * Common format: Date, Type, Symbol, Quantity, Price, Commission, Swap, Balance
 */
export function parseXtbCsv(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  const colMap = {
    date: headers.findIndex(h => h.includes('date') || h.includes('czas')),
    type: headers.findIndex(h => h.includes('type') || h.includes('typ')),
    symbol: headers.findIndex(h => h.includes('symbol') || h.includes('instrument')),
    quantity: headers.findIndex(h => h.includes('quantity') || h.includes('volume')),
    price: headers.findIndex(h => h.includes('price') || h.includes('cena')),
    commission: headers.findIndex(h => h.includes('commission') || h.includes('prowizja')),
    swap: headers.findIndex(h => h.includes('swap')),
    balance: headers.findIndex(h => h.includes('balance') || h.includes('saldo')),
  };

  const transactions = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 4) continue;

    try {
      const date = parseDate(cols[colMap.date]);
      const typeStr = cols[colMap.type].toLowerCase();
      const symbol = normalizeTicker(cols[colMap.symbol]);

      // XTB uses "buy" and "sell" directly, or numbers
      let type = 'buy';
      if (typeStr.includes('sell')) {
        type = 'sell';
      } else if (typeStr.includes('dividend') || typeStr.includes('odsetki')) {
        type = 'dividend';
      }

      const quantity = Math.abs(parseNumber(cols[colMap.quantity]));
      const price = parseNumber(cols[colMap.price]);
      const commission = parseNumber(cols[colMap.commission]) + parseNumber(cols[colMap.swap]);

      const tx = {
        type,
        date,
        ticker: symbol,
        shares: quantity,
        priceUsd: price,
        feeUsd: commission,
        notes: `XTB ${cols[colMap.type]}`,
      };

      // XTB often has balance column for dividend total
      if (tx.type === 'dividend') {
        const balance = parseNumber(cols[colMap.balance]);
        tx.dividendGrossUsd = balance > 0 ? balance : quantity * price;
      }

      const isValid = date && symbol && (
        (type === 'dividend' && tx.dividendGrossUsd > 0) ||
        (type !== 'dividend' && quantity > 0 && price > 0)
      );

      if (isValid) {
        transactions.push(tx);
      } else {
        errors.push(`Row ${i + 1}: Missing required data`);
      }
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  return { transactions, errors, warnings: [] };
}

/**
 * Generic smart parser - tries to detect brokerage format automatically
 */
export function parseCSV(csvText, brokerageHint = null) {
  const lowerText = csvText.toLowerCase();

  // Detect brokerage based on headers
  let detected = brokerageHint;
  if (!detected) {
    if (lowerText.includes('schwab') || lowerText.includes('charles schwab') || lowerText.includes('date,description,symbol')) {
      detected = 'schwab';
    } else if (lowerText.includes('interactive brokers') || lowerText.includes('ibkr') || lowerText.includes('t.price')) {
      detected = 'ibkr';
    } else if (lowerText.includes('xtb') || lowerText.includes('x-trade') || lowerText.includes('cena')) {
      detected = 'xtb';
    } else if (lowerText.includes('degiro') || (lowerText.includes('product') && lowerText.includes('isin') && lowerText.includes('value'))) {
      detected = 'degiro';
    } else {
      // Try generic parser
      return parseGenericCSV(csvText);
    }
  }

  switch (detected.toLowerCase()) {
    case 'schwab':
      return parseSchwabCSV(csvText);
    case 'ibkr':
    case 'interactive brokers':
      return parseIbkrCSV(csvText);
    case 'xtb':
      return parseXtbCsv(csvText);
    case 'degiro':
      return parseDegiroCSV(csvText);
    default:
      return parseGenericCSV(csvText);
  }
}

/**
 * DEGIRO CSV Parser
 * Common format: Date,Time,Product,ISIN,Description,FX,Change,,Total,,Order ID
 * Or: Date,Time,Product,ISIN,Exchange,Execution,Quantity,Price,,Value,,Transaction costs,,Total,,Order ID
 */
export function parseDegiroCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return { transactions: [], errors: ['CSV is empty'], warnings: [] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

  const colMap = {
    date: headers.findIndex(h => h === 'date' || h.includes('date')),
    product: headers.findIndex(h => h === 'product' || h.includes('product')),
    isin: headers.findIndex(h => h === 'isin' || h.includes('isin')),
    description: headers.findIndex(h => h === 'description' || h.includes('description')),
    quantity: headers.findIndex(h => h === 'quantity' || h.includes('quantity')),
    price: headers.findIndex(h => h === 'price' || (h.includes('price') && !h.includes('local'))),
    value: headers.findIndex(h => h === 'value' || (h.includes('value') && !h.includes('local'))),
    costs: headers.findIndex(h => h.includes('transaction costs') || h.includes('costs')),
    total: headers.findIndex(h => h === 'total' || h.includes('total')),
  };

  const transactions = [];
  const errors = [];
  const warnings = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted CSV fields
    const cols = lines[i].match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || [];
    const cleanCols = cols.map(c => c.trim().replace(/^"|"$/g, ''));

    if (cleanCols.length < 4) continue;

    try {
      const date = parseDate(cleanCols[colMap.date]);
      const productName = colMap.product >= 0 ? cleanCols[colMap.product] : '';
      const description = colMap.description >= 0 ? cleanCols[colMap.description].toLowerCase() : '';

      // Extract ticker from product name or ISIN
      let symbol = '';
      if (colMap.isin >= 0 && cleanCols[colMap.isin]) {
        // Use last part of product name as ticker approximation, or ISIN
        const productParts = productName.split(/\s+/);
        symbol = productParts[0]; // First word is often the ticker
      } else {
        symbol = productName.split(/\s+/)[0];
      }
      symbol = normalizeTicker(symbol);

      const quantity = colMap.quantity >= 0 ? Math.abs(parseNumber(cleanCols[colMap.quantity])) : 0;
      const price = colMap.price >= 0 ? Math.abs(parseNumber(cleanCols[colMap.price])) : 0;
      const costs = colMap.costs >= 0 ? Math.abs(parseNumber(cleanCols[colMap.costs])) : 0;

      // Determine transaction type
      let type = 'buy';
      if (description.includes('sell') || description.includes('sold') || description.includes('verkoop')) {
        type = 'sell';
      } else if (description.includes('buy') || description.includes('koop')) {
        type = 'buy';
      } else if (description.includes('dividend') || description.includes('coupon')) {
        type = 'dividend';
      }

      // Check quantity sign for buy/sell
      if (colMap.quantity >= 0 && cleanCols[colMap.quantity]) {
        const rawQty = parseNumber(cleanCols[colMap.quantity]);
        if (rawQty < 0) type = 'sell';
        else if (rawQty > 0 && type === 'buy') type = 'buy';
      }

      const tx = {
        type,
        date,
        ticker: symbol,
        shares: quantity,
        priceUsd: price,
        feeUsd: costs,
        notes: productName || description,
      };

      if (type === 'dividend') {
        const total = colMap.total >= 0 ? Math.abs(parseNumber(cleanCols[colMap.total])) : 0;
        const value = colMap.value >= 0 ? Math.abs(parseNumber(cleanCols[colMap.value])) : 0;
        tx.dividendGrossUsd = total || value || quantity * price;
      }

      const isValid = date && symbol && (
        (type === 'dividend' && tx.dividendGrossUsd > 0) ||
        (type !== 'dividend' && quantity > 0 && price > 0)
      );

      if (isValid) {
        transactions.push(tx);
      } else {
        errors.push(`Row ${i + 1}: Missing required data`);
      }
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  if (transactions.length > 0) {
    warnings.push('DEGIRO: prices are in local currency. Ensure USD conversion if transactions are not in USD.');
  }

  return { transactions, errors, warnings };
}

/**
 * Generic fallback parser - attempts to intelligently detect columns
 */
function parseGenericCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return { transactions: [], errors: ['CSV is empty'], warnings: [] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  // Try to auto-detect columns
  const colIndices = {
    date: headers.findIndex(h => h.includes('date')),
    symbol: headers.findIndex(h => h.includes('symbol') || h.includes('ticker')),
    quantity: headers.findIndex(h => h.includes('quantity') || h.includes('shares')),
    price: headers.findIndex(h => h.includes('price')),
    commission: headers.findIndex(h => h.includes('commission') || h.includes('fee')),
  };

  // Check if we have minimum required columns
  if (colIndices.date === -1 || colIndices.symbol === -1 || colIndices.quantity === -1 || colIndices.price === -1) {
    return {
      transactions: [],
      errors: ['Could not detect required columns: date, symbol, quantity, price'],
      warnings: [`Found columns: ${headers.join(', ')}`],
    };
  }

  const transactions = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < headers.length) continue;

    try {
      const date = parseDate(cols[colIndices.date]);
      const symbol = normalizeTicker(cols[colIndices.symbol]);
      const quantity = Math.abs(parseNumber(cols[colIndices.quantity]));
      const price = parseNumber(cols[colIndices.price]);
      const commission = colIndices.commission >= 0 ? parseNumber(cols[colIndices.commission]) : 0;

      const type = quantity > 0 ? 'buy' : 'sell'; // Can't reliably detect from generic format

      const tx = {
        type,
        date,
        ticker: symbol,
        shares: quantity,
        priceUsd: price,
        feeUsd: commission,
        notes: 'Imported from CSV',
      };

      if (date && symbol && quantity > 0 && price > 0) {
        transactions.push(tx);
      } else {
        errors.push(`Row ${i + 1}: Missing required data`);
      }
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  return { transactions, errors, warnings: ['Using generic parser - review imported transactions'] };
}
