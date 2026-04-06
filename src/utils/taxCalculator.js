/**
 * Tax calculator for PIT38 using FIFO method
 * Polish tax rates: 19% on capital gains and dividends
 */

/**
 * Calculate current portfolio holdings (unrealized positions) using FIFO
 * @param {Array} transactions - Array of transaction objects
 * @param {Object} exchangeRates - Map of date -> USD/PLN rate
 * @returns {Array} holdings - Current open positions with cost basis
 */
export function calculateHoldings(transactions, exchangeRates) {
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  // FIFO inventory per ticker
  const inventory = {};

  for (const tx of sorted) {
    if (tx.type === 'buy') {
      if (!inventory[tx.ticker]) inventory[tx.ticker] = [];
      inventory[tx.ticker].push({
        date: tx.date,
        shares: tx.shares,
        remainingShares: tx.shares,
        priceUsd: tx.priceUsd,
        feeUsd: tx.feeUsd || 0,
      });
    } else if (tx.type === 'sell') {
      let sharesToSell = tx.shares;
      const lots = inventory[tx.ticker] || [];

      for (const lot of lots) {
        if (sharesToSell <= 0) break;
        const consumed = Math.min(sharesToSell, lot.remainingShares);
        lot.remainingShares -= consumed;
        sharesToSell -= consumed;
      }

      // Remove exhausted lots
      if (inventory[tx.ticker]) {
        inventory[tx.ticker] = inventory[tx.ticker].filter(l => l.remainingShares > 0);
      }
    }
  }

  // Build holdings summary
  const holdings = [];
  for (const [ticker, lots] of Object.entries(inventory)) {
    const activeLots = lots.filter(l => l.remainingShares > 0);
    if (activeLots.length === 0) continue;

    const totalShares = activeLots.reduce((sum, l) => sum + l.remainingShares, 0);
    const totalCostUsd = activeLots.reduce(
      (sum, l) => sum + l.remainingShares * l.priceUsd + l.feeUsd * (l.remainingShares / l.shares),
      0
    );
    const avgCostPerShareUsd = totalShares > 0 ? totalCostUsd / totalShares : 0;

    // Use earliest buy date rate for reference
    const firstDate = activeLots[0].date;
    const rate = exchangeRates[firstDate];

    holdings.push({
      ticker,
      totalShares,
      totalCostUsd,
      avgCostPerShareUsd,
      totalCostPln: rate ? totalCostUsd * rate : null,
      lots: activeLots,
    });
  }

  return holdings.sort((a, b) => a.ticker.localeCompare(b.ticker));
}

const TAX_RATE = 0.19;

/**
 * Calculate capital gains and dividends using FIFO inventory tracking
 * @param {Array} transactions - Array of transaction objects
 * @param {Object} exchangeRates - Map of date -> USD/PLN rate
 * @returns {Object} totals including capital gains and dividends in PLN
 */
export function calculateTaxes(transactions, exchangeRates) {
  // Sort transactions by date (oldest first)
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  // FIFO inventory: array of buy lots with { id, date, ticker, remainingShares, priceUsd, feeUsd }
  const inventory = [];

  let totalCapitalGainPlN = 0;
  let totalDividendGrossPlN = 0;
  let totalForeignTaxCreditPlN = 0;
  const realizedGains = []; // For reporting

  for (const tx of sorted) {
    const rate = exchangeRates[tx.date];
    if (!rate) {
      console.warn(`Missing exchange rate for ${tx.date}`);
      continue;
    }

    if (tx.type === 'buy') {
      // Add to inventory
      inventory.push({
        id: tx.id,
        date: tx.date,
        ticker: tx.ticker,
        remainingShares: tx.shares,
        priceUsd: tx.priceUsd,
        feeUsd: tx.feeUsd || 0,
      });
    } else if (tx.type === 'sell') {
      // Allocate from oldest inventory first (FIFO)
      let sharesToSell = tx.shares;
      const sellFeeUsd = tx.feeUsd || 0;
      const sellProceedsUsdTotal = tx.shares * tx.priceUsd - sellFeeUsd;

      // Pre-calculate cost per share for each buy lot (including buy fees)
      const preparedLots = inventory.map(lot => ({
        ...lot,
        costBasisTotalUsd: (lot.priceUsd * lot.remainingShares) + lot.feeUsd,
        costPerShareUsd: lot.feeUsd
          ? (lot.priceUsd * lot.remainingShares + lot.feeUsd) / lot.remainingShares
          : lot.priceUsd,
      }));

      let lotIndex = 0;
      while (sharesToSell > 0 && lotIndex < preparedLots.length) {
        const lot = preparedLots[lotIndex];
        if (lot.remainingShares <= 0) {
          lotIndex++;
          continue;
        }

        const sharesFromLot = Math.min(sharesToSell, lot.remainingShares);
        const proportion = sharesFromLot / lot.remainingShares;
        const allocatedBuyCostUsd = lot.costBasisTotalUsd * proportion;
        const allocatedSellProceedsUsd = (sellProceedsUsdTotal / tx.shares) * sharesFromLot;
        const gainUsd = allocatedSellProceedsUsd - allocatedBuyCostUsd;

        // Convert to PLN
        const rate = exchangeRates[tx.date];
        const gainPlN = gainUsd * rate;

        realizedGains.push({
          sellId: tx.id,
          lotId: lot.id,
          ticker: tx.ticker,
          buyDate: lot.date,
          sellDate: tx.date,
          shares: sharesFromLot,
          gainUsd,
          gainPlN,
        });

        totalCapitalGainPlN += gainPlN;

        // Update inventory
        lot.remainingShares -= sharesFromLot;
        lot.costBasisTotalUsd -= allocatedBuyCostUsd;
        sharesToSell -= sharesFromLot;

        if (lot.remainingShares <= 0) {
          lotIndex++;
        }
      }

      // Sync back to main inventory
      for (let i = 0; i < inventory.length; i++) {
        inventory[i].remainingShares = preparedLots[i].remainingShares;
      }

      if (sharesToSell > 0) {
        console.warn(`Sell of ${tx.shares} ${tx.ticker} exceeds available inventory`);
      }
    } else if (tx.type === 'dividend') {
      const rate = exchangeRates[tx.date];
      const grossPlN = (tx.dividendGrossUsd || 0) * rate;
      const foreignTaxPlN = (tx.foreignTaxUsd || 0) * rate;

      totalDividendGrossPlN += grossPlN;
      totalForeignTaxCreditPlN += foreignTaxPlN;
    }
  }

  // Polish dividend tax: 19% on gross dividend minus foreign tax credit (capped at Polish tax)
  const dividendTaxPlN = Math.max(0, totalDividendGrossPlN * TAX_RATE - Math.min(totalForeignTaxCreditPlN, totalDividendGrossPlN * TAX_RATE));

  // Capital gains tax: apply to net gains (losses offset gains)
  const capitalGainsTaxPlN = Math.max(0, totalCapitalGainPlN * TAX_RATE);

  const totalTaxPlN = dividendTaxPlN + capitalGainsTaxPlN;

  return {
    totalCapitalGainPlN,
    totalDividendGrossPlN,
    totalForeignTaxCreditPlN,
    capitalGainsTaxPlN,
    dividendTaxPlN,
    totalTaxPlN,
    realizedGains,
  };
}
