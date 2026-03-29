import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function TransactionForm({ onSubmit, initialValues = null }) {
  const [formData, setFormData] = useState({
    type: initialValues?.type || 'buy',
    date: initialValues?.date || new Date().toISOString().split('T')[0],
    ticker: initialValues?.ticker || '',
    shares: initialValues?.shares || '',
    priceUsd: initialValues?.priceUsd || '',
    feeUsd: initialValues?.feeUsd || '',
    dividendGrossUsd: '',
    foreignTaxUsd: '',
    notes: '',
    ...initialValues,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const transaction = {
      id: initialValues?.id || uuidv4(),
      type: formData.type,
      date: formData.date,
      ticker: formData.ticker.toUpperCase(),
      shares: parseFloat(formData.shares),
      priceUsd: parseFloat(formData.priceUsd) || 0,
      feeUsd: parseFloat(formData.feeUsd) || 0,
      dividendGrossUsd: formData.dividendGrossUsd ? parseFloat(formData.dividendGrossUsd) : undefined,
      foreignTaxUsd: formData.foreignTaxUsd ? parseFloat(formData.foreignTaxUsd) : undefined,
      notes: formData.notes || undefined,
    };

    onSubmit(transaction);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      type: 'buy',
      date: new Date().toISOString().split('T')[0],
      ticker: '',
      shares: '',
      priceUsd: '',
      feeUsd: '',
      dividendGrossUsd: '',
      foreignTaxUsd: '',
      notes: '',
    });
  };

  const isDividend = formData.type === 'dividend';

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-xl font-bold mb-4">
        {initialValues ? 'Edit Transaction' : 'Add Transaction'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
            <option value="dividend">Dividend</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Ticker</label>
          <input
            type="text"
            name="ticker"
            value={formData.ticker}
            onChange={handleChange}
            required
            placeholder="AAPL"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 uppercase"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Shares</label>
          <input
            type="number"
            name="shares"
            value={formData.shares}
            onChange={handleChange}
            required
            step="0.000001"
            min="0"
            placeholder="100"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {!isDividend && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Price per Share (USD)</label>
              <input
                type="number"
                name="priceUsd"
                value={formData.priceUsd}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                placeholder="150.00"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Commission/Fee (USD)</label>
              <input
                type="number"
                name="feeUsd"
                value={formData.feeUsd}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {isDividend && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Gross Dividend (USD)</label>
              <input
                type="number"
                name="dividendGrossUsd"
                value={formData.dividendGrossUsd}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Foreign Tax Withheld (USD)</label>
              <input
                type="number"
                name="foreignTaxUsd"
                value={formData.foreignTaxUsd}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="Usually 15% for US stocks"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Notes (optional)</label>
          <input
            type="text"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Optional notes"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium"
        >
          {initialValues ? 'Update' : 'Add'} Transaction
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 font-medium"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
