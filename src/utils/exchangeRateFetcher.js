/**
 * NBP (Narodowy Bank Polski) exchange rate fetcher
 * API: https://api.nbp.pl/api/exchangerates/rates/{table}/code/{date}/?format=json
 */

const RATES_CACHE_KEY = 'nbp_rates_cache';
const GLOBAL_RATES_URL = '/nbp-rates.json';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

let globalRatesCache = null;

/**
 * Load global NBP rates from public/nbp-rates.json (populated by GitHub Action)
 */
async function loadGlobalRates() {
  if (globalRatesCache !== null) return globalRatesCache;

  try {
    const response = await fetch(GLOBAL_RATES_URL);
    if (response.ok) {
      globalRatesCache = await response.json();
      console.log('Loaded global NBP rates from /nbp-rates.json');
      return globalRatesCache;
    }
  } catch (err) {
    console.log('No global NBP rates cache available');
  }
  globalRatesCache = {};
  return globalRatesCache;
}

/**
 * Fetch exchange rate for a specific date, checking caches in order:
 * 1. Global rates file (from GitHub Action)
 * 2. localStorage cache
 * 3. NBP API fallback
 */
export async function fetchRateForDate(date) {
  // Check global rates first
  const globalRates = await loadGlobalRates();
  if (globalRates[date]) {
    return globalRates[date];
  }

  // Check localStorage cache
  const cache = loadCache();
  if (cache[date] && cache[date].timestamp > Date.now() - CACHE_DURATION_MS) {
    return cache[date].rate;
  }

  // Fetch from NBP API
  try {
    const response = await fetch(`https://api.nbp.pl/api/exchangerates/rates/a/usd/${date}/?format=json`);
    if (!response.ok) {
      if (response.status === 404) {
        // NBP often doesn't have data for weekends/holidays
        // Try to find nearest available date
        const nearest = await findNearestAvailableRate(date);
        if (nearest) {
          saveCache(date, nearest.rate);
          return nearest.rate;
        }
        throw new Error(`No exchange rate available for ${date} or nearby dates`);
      }
      throw new Error(`NBP API error: ${response.status}`);
    }
    const data = await response.json();
    const rate = data.rates[0].mid;

    // Cache the fetched rate
    saveCache(date, rate);

    return rate;
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    throw error;
  }
}

/**
 * Load exchange rate cache from localStorage
 */
function loadCache() {
  try {
    const cached = localStorage.getItem(RATES_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * Save rate to cache
 */
function saveCache(date, rate) {
  const cache = loadCache();
  cache[date] = {
    rate,
    timestamp: Date.now(),
  };
  localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(cache));
}

/**
 * Find the nearest available rate to a target date
 * Searches backwards and forwards up to 30 days
 */
async function findNearestAvailableRate(targetDate) {
  const target = new Date(targetDate);
  const maxDays = 30;

  // Check backwards
  for (let i = 1; i <= maxDays; i++) {
    const date = new Date(target);
    date.setDate(date.getDate() - i);
    const dateStr = formatDate(date);
    try {
      const response = await fetch(`https://api.nbp.pl/api/exchangerates/rates/a/usd/${dateStr}/?format=json`);
      if (response.ok) {
        const data = await response.json();
        return { date: dateStr, rate: data.rates[0].mid };
      }
    } catch {
      // ignore and continue
    }
  }

  // Check forwards
  for (let i = 1; i <= maxDays; i++) {
    const date = new Date(target);
    date.setDate(date.getDate() + i);
    const dateStr = formatDate(date);
    try {
      const response = await fetch(`https://api.nbp.pl/api/exchangerates/rates/a/usd/${dateStr}/?format=json`);
      if (response.ok) {
        const data = await response.json();
        return { date: dateStr, rate: data.rates[0].mid };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Bulk fetch rates for multiple dates
 * Efficiently fetches and caches multiple dates
 */
export async function fetchRatesForDates(dates) {
  const uniqueDates = [...new Set(dates)];
  const rates = {};

  await Promise.all(
    uniqueDates.map(async (date) => {
      try {
        const rate = await fetchRateForDate(date);
        rates[date] = rate;
      } catch (error) {
        console.error(`Failed to fetch rate for ${date}:`, error);
      }
    })
  );

  return rates;
}

/**
 * Get multiple rates, using cache first
 * @param {string[]} dates - Array of dates in YYYY-MM-DD
 * @returns {Promise<Object>} Map date -> rate
 */
export async function getExchangeRates(dates) {
  const result = {};
  const cache = loadCache();

  // Separate cached and uncached dates
  for (const date of dates) {
    if (cache[date] && cache[date].timestamp > Date.now() - CACHE_DURATION_MS) {
      result[date] = cache[date].rate;
    }
  }

  // Fetch remaining
  const missingDates = dates.filter(d => !(d in result));
  if (missingDates.length > 0) {
    const fetched = await fetchRatesForDates(missingDates);
    Object.assign(result, fetched);
  }

  return result;
}
