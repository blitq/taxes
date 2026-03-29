# PIT38 Tax Calculator

A simple web application for Polish individual investors to calculate PIT38 taxes on US stock investments. Automatically converts USD to PLN using NBP exchange rates.

## Features

- Track buy, sell, and dividend transactions
- FIFO (First-In-First-Out) capital gains calculation
- Dividend tax with US withholding tax credit
- Automatic USD → PLN conversion using NBP daily rates
- Data stored locally in browser (private)
- Export transactions and summary to CSV
- Print/Save PDF reports
- Hosted on GitHub Pages

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- GitHub Actions for CI/CD and NBP rate caching
- GitHub Pages for hosting
- NBP API for exchange rates

## Getting Started

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

### Deploy to GitHub Pages (Automatic)

The repository includes a GitHub Actions workflow that automatically builds and deploys on push to `main`:

1. Push to a GitHub repository
2. Enable GitHub Pages in repository settings:
   - Source: **Deploy from a branch**
   - Branch: `gh-pages` (the workflow creates this branch automatically)
3. The site will be available at `https://yourusername.github.io/pit38-tax-calculator/`

Alternatively, manually trigger the workflow from the "Actions" tab.

**Note:** If deploying to a user/organization site (`username.github.io`), adjust `vite.config.js` `base` to `/` instead of `./`.

## Data Storage

All transaction data is stored in your browser's localStorage. It persists across sessions but is specific to your browser/device. You can export/import data via CSV.

## NBP Exchange Rates

The app fetches USD/PLN rates from the NBP API on demand and caches them for 24 hours. A GitHub Action runs daily to pre-fetch rates for the current year and includes them in the deployment at `/nbp-rates.json`.

### Supported Brokerages & Import

The app supports importing transaction history from the following brokerages:
- **Charles Schwab** - Export as CSV with default columns
- **Interactive Brokers (IBKR)** - Flex Query or Activity Statement CSV
- **XTB** - History report CSV (xStation)

**To import:**
1. Click "Import from CSV" button
2. Select your brokerage format
3. Upload your CSV file
4. Preview the detected transactions
5. Click "Import" to add to your records

*Templates are available in the import modal to help format your exports correctly.*

You can also export all transactions to CSV for backup or manual record-keeping.

## Tax Calculation Details

- **Capital Gains Tax (podatek od zysków kapitałowych):** 19%
- **Dividend Tax (podatek od dochodów z kapitałów):** 19% on gross dividend, minus foreign tax credit (e.g., US withholding)
- **Method:** FIFO for matching sell orders with buy orders
- **Currency conversion:** NBP mid rate for transaction date (or nearest available)

## Disclaimer

This tool is for informational purposes only and does not constitute tax advice. Consult a qualified tax advisor for official tax filings.

## License

MIT
