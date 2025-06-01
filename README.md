# World University Rankings Aggregator

This project aggregates university rankings from multiple sources (QS, THE, ARWU, US News) using a Borda Count with Penalized Absence method.

## Setup

Make sure you have Node.js and npm installed.

1. Clone this repository.
2. Install dependencies for the frontend:

   ```bash
   cd frontend
   npm install
   ```

3. Install dependencies for the data processing scripts:

   ```bash
   cd ..
   npm install csv-parser axios cheerio puppeteer
   # Note: Puppeteer might require additional system dependencies depending on your OS.
   ```

## Updating Ranking Data and Regenerating Aggregated Data

To update the aggregated rankings:

1. Obtain updated ranking data files (e.g., CSV or similar formats for QS, THE, ARWU, US News).
2. Place the updated files in the `data/` directory, ensuring they are named appropriately (e.g., `qs_rankings.xlsx`, `the_rankings.xlsx`, `arwu_rankings.csv`, `usnews_rankings.csv`). You might need to adjust the script (`scripts/scrape-rankings.js`) if the format or filenames change significantly.
3. Run the data processing and aggregation script from the project root directory:

   ```bash
   node scripts/scrape-rankings.js
   ```

   This will read the updated data, process it, and save the new aggregated rankings to `frontend/src/data/aggregated-rankings.json`.

## Running the Frontend

To view the aggregated rankings in the web browser:

1. Navigate to the `frontend` directory:

   ```bash
   cd frontend
   ```

2. Start the React development server:

   ```bash
   npm start
   ```

   This will open the application in your default web browser (usually at `http://localhost:3000`). The frontend reads the data from `frontend/src/data/aggregated-rankings.json`. 