import { useState, useEffect, useCallback } from 'react';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import SummaryView from './components/SummaryView';
import ImportModal from './components/ImportModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useNbpRates } from './hooks/useNbpRates';
import { exportTransactionsCSV, downloadFile } from './utils/csvExporter.js';

const STORAGE_KEY = 'pit38_transactions';

function App() {
  const [transactions, setTransactions] = useLocalStorage(STORAGE_KEY, []);
  const [activeView, setActiveView] = useState('transactions');
  const [showImportModal, setShowImportModal] = useState(false);
  const { rates, fetchRates, getRate, loading, error } = useNbpRates();

  // Fetch exchange rates for all transaction dates when transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      const dates = transactions
        .map(t => t.date)
        .filter((date, idx, arr) => arr.indexOf(date) === idx); // unique
      fetchRates(dates);
    }
  }, [transactions, fetchRates]);

  // Build exchange rates map from hook state
  const exchangeRatesMap = {};
  transactions.forEach(tx => {
    if (rates[tx.date]) {
      exchangeRatesMap[tx.date] = rates[tx.date];
    }
  });

  const addTransaction = useCallback((tx) => {
    setTransactions(prev => [...prev, tx]);
  }, [setTransactions]);

  const updateTransaction = useCallback((updatedTx) => {
    setTransactions(prev =>
      prev.map(tx => (tx.id === updatedTx.id ? updatedTx : tx))
    );
  }, [setTransactions]);

  const deleteTransaction = useCallback((id) => {
    if (window.confirm('Delete this transaction?')) {
      setTransactions(prev => prev.filter(tx => tx.id !== id));
    }
  }, [setTransactions]);

  const exportCSV = useCallback(() => {
    const csv = exportTransactionsCSV(transactions);
    downloadFile(csv, `transactions-${new Date().toISOString().split('T')[0]}.csv`);
  }, [transactions]);

  const clearAll = useCallback(() => {
    if (window.confirm('Delete all transactions? This cannot be undone.')) {
      setTransactions([]);
    }
  }, [setTransactions]);

  const handleImport = useCallback((importedTransactions) => {
    setTransactions(prev => [...prev, ...importedTransactions]);
  }, [setTransactions]);

  // Count displayed rate info
  const missingRates = transactions.filter(tx => !exchangeRatesMap[tx.date]).length;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">PIT38 Tax Calculator</h1>
          <p className="text-sm text-blue-200">For US Stocks (USD → PLN conversion)</p>
        </div>
      </header>

      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveView('transactions')}
              className={`px-4 py-3 border-b-2 font-medium ${
                activeView === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveView('summary')}
              className={`px-4 py-3 border-b-2 font-medium ${
                activeView === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Summary
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Exchange Rate Info */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium mb-2">Exchange Rates (NBP USD/PLN)</h3>
          {loading && <p className="text-sm text-blue-600">Fetching rates...</p>}
          {error && <p className="text-sm text-red-600">Error: {error}</p>}
          {missingRates > 0 && (
            <p className="text-sm text-yellow-600">
              Warning: Missing exchange rates for {missingRates} date(s).
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Rates are auto-fetched from NBP API and cached locally (24h).
          </p>
        </div>

        {/* Add Transaction */}
        {activeView === 'transactions' && (
          <TransactionForm onSubmit={addTransaction} />
        )}

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-medium"
          >
            Import from CSV
          </button>
          <button
            onClick={exportCSV}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium"
            disabled={transactions.length === 0}
          >
            Export All Transactions CSV
          </button>
          {transactions.length > 0 && (
            <button
              onClick={clearAll}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-medium"
            >
              Clear All Data
            </button>
          )}
        </div>

        {/* Transaction List */}
        {activeView === 'transactions' && (
          <TransactionList
            transactions={transactions}
            onUpdate={updateTransaction}
            onDelete={deleteTransaction}
            nbpRates={exchangeRatesMap}
          />
        )}

        {/* Summary */}
        {activeView === 'summary' && (
          <SummaryView
            transactions={transactions}
            exchangeRates={exchangeRatesMap}
          />
        )}
      </main>

      <footer className="mt-12 py-4 text-center text-sm text-gray-500">
        <p>PIT38 Tax Calculator • Data stored locally in browser</p>
        <p className="text-xs mt-1">
          For informational purposes only. Consult a tax advisor for official filings.
        </p>
      </footer>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
    </div>
  );
}

export default App;
