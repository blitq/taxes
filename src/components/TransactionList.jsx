import { useState } from 'react';
import React from 'react';
import TransactionForm from './TransactionForm';

export default function TransactionList({ transactions, onUpdate, onDelete, nbpRates }) {
  const [editingId, setEditingId] = useState(null);
  const [filterType, setFilterType] = useState('all');

  const filteredTransactions = filterType === 'all'
    ? transactions
    : transactions.filter(t => t.type === filterType);

  const handleEdit = (tx) => {
    setEditingId(tx.id);
  };

  const handleUpdate = (updatedTx) => {
    onUpdate(updatedTx);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const formatUSD = (value) => {
    return value ? `$${value.toFixed(2)}` : '-';
  };

  const formatPLN = (usdValue, date) => {
    if (usdValue === undefined || usdValue === null) return '-';
    const rate = nbpRates[date];
    const pln = usdValue * rate;
    return rate ? `${pln.toFixed(2)} PLN` : '? PLN';
  };

  const typeColors = {
    buy: 'bg-green-100 text-green-800',
    sell: 'bg-red-100 text-red-800',
    dividend: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold">Transactions ({transactions.length})</h2>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="buy">Buys</option>
            <option value="sell">Sells</option>
            <option value="dividend">Dividends</option>
          </select>
        </div>
      </div>

      {editingId && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <TransactionForm
            onSubmit={handleUpdate}
            initialValues={transactions.find(t => t.id === editingId)}
          />
          <button
            onClick={handleCancelEdit}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            Cancel Edit
          </button>
        </div>
      )}

      {transactions.length === 0 ? (
        <p className="text-gray-500 italic">No transactions yet. Add your first transaction above.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticker</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Shares</th>
                {filterType !== 'dividend' && (
                  <>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price (USD)</th>
                  </>
                )}
                {filterType === 'dividend' && (
                  <>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Div (USD)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Foreign Tax (USD)</th>
                  </>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fee (USD)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total (PLN)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{tx.date}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[tx.type]}`}>
                      {tx.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{tx.ticker}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">{tx.shares.toFixed(6)}</td>
                  {tx.type !== 'dividend' && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatUSD(tx.priceUsd)}
                    </td>
                  )}
                  {tx.type === 'dividend' && (
                    <React.Fragment>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatUSD(tx.dividendGrossUsd)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatUSD(tx.foreignTaxUsd)}
                      </td>
                    </React.Fragment>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatUSD(tx.feeUsd)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                    {tx.type === 'buy' && formatPLN(tx.shares * tx.priceUsd + (tx.feeUsd || 0), tx.date)}
                    {tx.type === 'sell' && formatPLN(tx.shares * tx.priceUsd - (tx.feeUsd || 0), tx.date)}
                    {tx.type === 'dividend' && formatPLN(tx.dividendGrossUsd, tx.date)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(tx)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(tx.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
