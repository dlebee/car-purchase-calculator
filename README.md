# Car Purchase Calculator

A Next.js application for calculating and comparing car purchase costs with detailed financial breakdowns.

## Features

- Add, edit, and delete cars with detailed financial information
- Compare multiple cars side-by-side
- Payment breakdown charts showing interest and principal over time
- Export/import cars as JSON
- CSV export for comparison tables
- VIN lookup to auto-fill car details (uses free NHTSA API - no API key required)

## Setup

No API keys or environment variables required! The VIN lookup feature uses the free NHTSA (National Highway Traffic Safety Administration) VIN decoder API, which is completely free and requires no authentication.

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Adding a Car

1. Click "Add New Car"
2. Enter car details manually, OR
3. Enter a VIN and click "Fetch Details" to auto-fill Make, Model, Year, Tier, and Mileage
4. Fill in financial details (prices, APR, term length, fees, etc.)
5. Click "Save"

### Comparing Cars

1. Navigate to the "Compare Cars" page
2. Select cars to compare
3. Optionally set overrides for Down Payment, Term Length, or APR to compare all cars under the same financing conditions
4. Export comparison as CSV if needed

### Exporting/Importing

- **Export Single Car**: Click "Export JSON" in the car form
- **Export All Cars**: Click "Export All Cars" on the main page
- **Import**: Use "Import JSON" in the car form or "Import All Cars" on the main page

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Recharts (for charts)
- NHTSA VIN Decoder API (free, no API key required)
