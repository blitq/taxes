import { useState, useRef } from 'react';
import { parseCSV } from '../utils/brokerageParsers.js';

const BROKERAGES = [
  { id: 'schwab', name: 'Charles Schwab', description: 'US brokerage' },
  { id: 'ibkr', name: 'Interactive Brokers (IBKR)', description: 'Global brokerage' },
  { id: 'xtb', name: 'XTB', description: 'Polish/European brokerage' },
  { id: 'degiro', name: 'DEGIRO', description: 'European online broker' },
  { id: 'generic', name: 'Generic CSV', description: 'Custom format (date, symbol, quantity, price)' },
];

export default function ImportModal({ isOpen, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [brokerage, setBrokerage] = useState('schwab');
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      const isCsv = selected.type === 'text/csv' ||
        selected.type === 'application/csv' ||
        selected.type === 'text/plain' ||
        selected.type === 'application/vnd.ms-excel' ||
        selected.type === 'application/octet-stream' ||
        selected.name.toLowerCase().endsWith('.csv');
      if (isCsv) {
        setFile(selected);
        setErrors([]);
        previewCSV(selected, brokerage);
      } else {
        setErrors(['Please select a valid CSV file (.csv extension)']);
      }
    }
  };

  const previewCSV = async (fileObj, brokerageId) => {
    setLoading(true);
    try {
      const text = await fileObj.text();
      const result = parseCSV(text, brokerageId);
      setPreview(result);

      if (result.errors.length > 0) {
        setErrors(result.errors);
      }
    } catch (err) {
      setErrors([`Failed to parse CSV: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleBrokerageChange = (newBrokerage) => {
    setBrokerage(newBrokerage);
    setErrors([]);
    // Re-parse the already-uploaded file with the new brokerage format
    if (file) {
      previewCSV(file, newBrokerage);
    }
  };

  const handleImport = () => {
    if (preview && preview.transactions.length > 0) {
      onImport(preview.transactions);
      onClose();
      reset();
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Import Transactions from CSV</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Brokerage selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Brokerage Format</label>
              {brokerage !== 'generic' && (
                <a
                  href={`${import.meta.env.BASE_URL}templates/${brokerage}-template.csv`}
                  download
                  className="text-xs text-blue-600 hover:underline"
                >
                  Download {BROKERAGES.find(b => b.id === brokerage)?.name} template
                </a>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BROKERAGES.map(b => (
                <label
                  key={b.id}
                  className={`border rounded-lg p-3 cursor-pointer transition ${
                    brokerage === b.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="brokerage"
                    value={b.id}
                    checked={brokerage === b.id}
                    onChange={(e) => handleBrokerageChange(e.target.value)}
                    className="sr-only"
                  />
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-gray-500">{b.description}</div>
                </label>
              ))}
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Select CSV File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,application/csv,text/plain"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <h4 className="font-medium text-red-800 mb-2">Errors</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview */}
          {loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2">Parsing CSV...</p>
            </div>
          )}

          {preview && !loading && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-green-800">
                  Found <strong>{preview.transactions.length}</strong> transactions ready to import
                  {preview.warnings.length > 0 && (
                    <span className="ml-2 text-yellow-700">({preview.warnings.length} warning{preview.warnings.length > 1 ? 's' : ''})</span>
                  )}
                </p>
              </div>

              {preview.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Warnings</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {preview.warnings.map((w, idx) => (
                      <li key={idx}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              {preview.transactions.length > 0 && (
                <div className="border rounded overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ticker</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Shares</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price (USD)</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Fee (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {preview.transactions.slice(0, 100).map((tx, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{tx.date}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-0.5 rounded text-xs ${tx.type === 'buy' ? 'bg-green-100 text-green-800' : tx.type === 'sell' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm font-medium">{tx.ticker}</td>
                            <td className="px-4 py-2 text-sm text-right">{tx.shares.toFixed(6)}</td>
                            <td className="px-4 py-2 text-sm text-right">{tx.priceUsd.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-right">{tx.feeUsd.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.transactions.length > 100 && (
                    <p className="p-2 text-sm text-gray-500 text-center bg-gray-50">
                      Showing first 100 of {preview.transactions.length} transactions
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!preview || preview.transactions.length === 0 || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Import {preview ? `${preview.transactions.length} Transactions` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
