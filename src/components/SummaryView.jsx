import { useMemo } from 'react';
import { calculateTaxes } from '../utils/taxCalculator.js';
import { exportSummaryCSV, downloadFile } from '../utils/csvExporter.js';

export default function SummaryView({ transactions, exchangeRates }) {
  const summary = useMemo(() => {
    if (transactions.length === 0) return null;
    return calculateTaxes(transactions, exchangeRates);
  }, [transactions, exchangeRates]);

  if (!summary) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
        No transactions to calculate. Add some transactions to see your tax summary.
      </div>
    );
  }

  const handleExportCSV = () => {
    const csv = exportSummaryCSV(summary);
    downloadFile(csv, `pit38-summary-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const formatCurrency = (value, currency = 'PLN') => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const SummaryCard = ({ title, value, color = 'text-gray-900', subtext }) => (
    <div className="bg-white p-4 rounded-lg shadow">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Capital Gains (PLN)"
          value={formatCurrency(summary.totalCapitalGainPlN)}
          color={summary.totalCapitalGainPlN >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <SummaryCard
          title="Dividends Gross (PLN)"
          value={formatCurrency(summary.totalDividendGrossPlN)}
        />
        <SummaryCard
          title="Foreign Tax Credit (PLN)"
          value={formatCurrency(summary.totalForeignTaxCreditPlN)}
          color="text-blue-600"
          subtext="US withholding tax"
        />
        <SummaryCard
          title="Total Tax Due (PLN)"
          value={formatCurrency(summary.totalTaxPlN)}
          color="text-red-600"
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Tax Breakdown</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-gray-700">Capital Gains Tax (19%)</span>
            <span className="font-medium">{formatCurrency(summary.capitalGainsTaxPlN)}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-gray-700">Dividend Tax (19%) - Foreign Credit</span>
            <span className="font-medium">{formatCurrency(summary.dividendTaxPlN)}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="font-bold text-gray-900">Total Tax</span>
            <span className="font-bold text-red-600">{formatCurrency(summary.totalTaxPlN)}</span>
          </div>
        </div>
      </div>

      {summary.realizedGains.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Realized Gains Detail (FIFO)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ticker</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Buy Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sell Date</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Shares</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Gain (USD)</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Gain (PLN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {summary.realizedGains.map((gain, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm font-medium">{gain.ticker}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{gain.buyDate}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{gain.sellDate}</td>
                    <td className="px-4 py-2 text-sm text-right">{gain.shares.toFixed(6)}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(gain.gainUsd, 'USD')}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(gain.gainPlN)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onExportCSV}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium"
        >
          Export Summary CSV
        </button>
        <button
          onClick={() => window.print()}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 font-medium"
        >
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
