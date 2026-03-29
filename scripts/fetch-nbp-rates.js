/**
 * Fetch NBP USD/PLN rates for all dates in the current year (or up to today)
 * Saves results as JSON files to the rates/ directory and a consolidated public/nbp-rates.json
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RATES_DIR = join(__dirname, '../rates/2025');
const PUBLIC_RATES_FILE = join(__dirname, '../public/nbp-rates.json');

async function fetchRateForDate(date) {
  return new Promise((resolve, reject) => {
    const url = `https://api.nbp.pl/api/exchangerates/rates/a/usd/${date}/?format=json`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.rates[0].mid);
          } catch (e) {
            resolve(null);
          }
        } else if (res.statusCode === 404) {
          resolve(null); // No rate for this date (weekend/holiday)
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

async function fetchAllRatesForYear(year) {
  const startDate = new Date(year, 0, 1); // Jan 1
  const endDate = new Date(); // Today (or Dec 31 if you prefer)
  endDate.setHours(23, 59, 59, 999);

  const rates = {};
  let current = new Date(startDate);

  console.log(`Fetching rates for ${year} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    try {
      const rate = await fetchRateForDate(dateStr);
      if (rate !== null) {
        rates[dateStr] = rate;
        // Also save individual file
        await mkdir(RATES_DIR, { recursive: true });
        await writeFile(
          join(RATES_DIR, `${dateStr}.json`),
          JSON.stringify({ date: dateStr, rate }, null, 2)
        );
      } else {
        console.log(`  No rate for ${dateStr}`);
      }
    } catch (err) {
      console.error(`  Error fetching ${dateStr}:`, err.message);
    }

    // Next day
    current.setDate(current.getDate() + 1);

    // Rate limit: be nice to NBP API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return rates;
}

async function main() {
  const year = 2025;
  const rates = await fetchAllRatesForYear(year);

  // Write consolidated public file
  await writeFile(PUBLIC_RATES_FILE, JSON.stringify(rates, null, 2));

  console.log(`Fetched ${Object.keys(rates).length} rates for ${year}`);
  console.log(`Saved to ${PUBLIC_RATES_FILE}`);
}

main().catch(console.error);
