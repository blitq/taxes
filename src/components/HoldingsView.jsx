import { useMemo } from 'react';
import { calculateHoldings } from '../utils/taxCalculator.js';

export default function HoldingsView({ transactions, exchangeRates }) {
  const holdings = useMemo(() => {
    if (transactions.length === 0) return [];
    return calculateHoldings(transactions, exchangeRates);
  }, [transactions, exchangeRates]);

  const formatUSD = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatPLN = (value) =>
    value != null
      ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value)
      : '—';

  if (holdings.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
        No open holdings. Add buy transactions to see your portfolio here.
      </div>
    );
  }

  const totalCostUsd = holdings.reduce((sum, h) => sum + h.totalCostUsd, 0);
  const totalCostPln = holdings.some(h => h.totalCostPln != null)
    ? holdings.reduce((sum, h) => sum + (h.totalCostPln ?? 0), 0)
    : null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Open Positions</p>
          <p className="text-2xl font-bold">{holdings.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Total Cost Basis (USD)</p>
          <p className="text-2xl font-bold">{formatUSD(totalCostUsd)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Total Cost Basis (PLN)</p>
          <p className="text-2xl font-bold">{formatPLN(totalCostPln)}</p>
          <p className="text-xs text-gray-400 mt-1">Using buy-date NBP rate</p>
        </div>
      </div>

      {/* Holdings table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-bold">Current Holdings (FIFO Cost Basis)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticker</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Shares</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Cost (USD)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost (USD)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost (PLN)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lots</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {holdings.map((h) => (
                <tr key={h.ticker} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{h.ticker}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{h.totalShares.toFixed(6)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatUSD(h.avgCostPerShareUsd)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatUSD(h.totalCostUsd)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatPLN(h.totalCostPln)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{h.lots.length}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-4 py-3 text-sm font-bold">Total</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-sm font-bold text-right">{formatUSD(totalCostUsd)}</td>
                <td className="px-4 py-3 text-sm font-bold text-right">{formatPLN(totalCostPln)}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        * Cost basis calculated using FIFO method. PLN values use the NBP USD/PLN rate from the buy date.
        This is an estimate — consult your broker for official cost basis statements.
      </p>
    </div>
  );
}
