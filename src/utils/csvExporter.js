/**
 * CSV export utilities
 */

/**
 * Convert transactions array to CSV string
 * @param {Array} transactions
 * @returns {string} CSV content
 */
export function exportTransactionsCSV(transactions) {
  if (transactions.length === 0) {
    return 'No transactions to export';
  }

  const headers = ['Date', 'Type', 'Ticker', 'Shares', 'Price (USD)', 'Fee (USD)', 'Dividend Gross (USD)', 'Foreign Tax (USD)', 'Notes'];
  const rows = transactions.map(tx => [
    tx.date,
    tx.type,
    tx.ticker,
    tx.shares,
    tx.priceUsd || '',
    tx.feeUsd || '',
    tx.dividendGrossUsd || '',
    tx.foreignTaxUsd || '',
    tx.notes || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Export summary to CSV
 * @param {Object} summary - Tax calculation results
 * @param {string} year - Optional tax year filter
 * @returns {string} CSV content
 */
export function exportSummaryCSV(summary, year = null) {
  const lines = [];

  if (year) {
    lines.push(`Tax Year,${year}`);
  }
  lines.push('');
  lines.push('Capital Gains (PLN),Dividends Gross (PLN),Foreign Tax Credit (PLN),Capital Gains Tax (PLN),Dividend Tax (PLN),Total Tax (PLN)');
  lines.push([
    summary.totalCapitalGainPlN.toFixed(2),
    summary.totalDividendGrossPlN.toFixed(2),
    summary.totalForeignTaxCreditPlN.toFixed(2),
    summary.capitalGainsTaxPlN.toFixed(2),
    summary.dividendTaxPlN.toFixed(2),
    summary.totalTaxPlN.toFixed(2),
  ].join(','));

  lines.push('');
  lines.push('Realized Gains Detail:');
  lines.push('Sell ID,Buy ID,Ticker,Buy Date,Sell Date,Shares,Gain (USD),Gain (PLN)');
  summary.realizedGains.forEach(gain => {
    lines.push([
      gain.sellId,
      gain.lotId,
      gain.ticker,
      gain.buyDate,
      gain.sellDate,
      gain.shares.toFixed(6),
      gain.gainUsd.toFixed(2),
      gain.gainPlN.toFixed(2),
    ].join(','));
  });

  return lines.join('\n');
}

/**
 * Download file in browser
 * @param {string} content
 * @param {string} filename
 */
export function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
