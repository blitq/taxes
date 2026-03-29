import { useState, useEffect, useCallback } from 'react';
import { getExchangeRates } from '../utils/exchangeRateFetcher.js';

/**
 * Custom hook for managing NBP exchange rates
 * Automatically fetches rates for given dates and caches them
 */
export function useNbpRates() {
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRates = useCallback(async (dates) => {
    if (!dates || dates.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const fetchedRates = await getExchangeRates(dates);
      setRates(prev => ({ ...prev, ...fetchedRates }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRate = useCallback((date) => {
    return rates[date];
  }, [rates]);

  return {
    rates,
    loading,
    error,
    fetchRates,
    getRate,
  };
}
